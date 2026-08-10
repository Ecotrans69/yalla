#!/usr/bin/env python3
"""Génère les audios neuraux (edge-tts) pour tous les items des 3 cours.

Sortie : public/audio/{id}.{voix}.mp3  avec voix h (homme), f (femme), e (enfant, anglais seulement).
Idempotent : les fichiers déjà présents sont sautés. Relancer en cas de coupure.
"""
import asyncio
import json
import os
import sys

import edge_tts

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'public', 'audio')

VOICES = {
    'en': {'h': 'en-US-GuyNeural', 'f': 'en-US-JennyNeural', 'e': 'en-US-AnaNeural'},
    'ar': {'h': 'ar-SA-HamedNeural', 'f': 'ar-SA-ZariyahNeural'},
    'dz': {'h': 'ar-DZ-IsmaelNeural', 'f': 'ar-DZ-AminaNeural'},
}


def collect_jobs():
    jobs = []  # (item_id, texte, course_id)
    for course_file in ('anglais.json', 'arabe.json', 'darija.json'):
        with open(os.path.join(ROOT, 'src', 'content', course_file), encoding='utf-8') as f:
            course = json.load(f)
        cid = course['id']
        for unit in course['units']:
            for lesson in unit['lessons']:
                for item in lesson.get('items') or []:
                    text = item['arScript'] if cid == 'dz' else item['text']
                    jobs.append((item['id'], text, cid))
                for letter in lesson.get('letters') or []:
                    jobs.append((letter['id'], letter['char'], cid))
    return jobs


async def gen_one(sem, item_id, text, cid, variant, voice):
    path = os.path.join(OUT, f'{item_id}.{variant}.mp3')
    if os.path.exists(path) and os.path.getsize(path) > 500:
        return 'skip'
    async with sem:
        for attempt in range(3):
            try:
                await edge_tts.Communicate(text, voice).save(path)
                if os.path.getsize(path) > 500:
                    return 'ok'
            except Exception as e:  # noqa: BLE001 — retry réseau
                if attempt == 2:
                    print(f'ÉCHEC {item_id}.{variant}: {e}', flush=True)
                    return 'fail'
                await asyncio.sleep(2 * (attempt + 1))
    return 'fail'


async def main():
    os.makedirs(OUT, exist_ok=True)
    jobs = collect_jobs()
    sem = asyncio.Semaphore(6)
    tasks = []
    for item_id, text, cid in jobs:
        for variant, voice in VOICES[cid].items():
            tasks.append(gen_one(sem, item_id, text, cid, variant, voice))
    print(f'{len(tasks)} fichiers à générer…', flush=True)
    results = await asyncio.gather(*tasks)
    ok = results.count('ok')
    skip = results.count('skip')
    fail = results.count('fail')
    print(f'TERMINÉ : {ok} générés, {skip} déjà présents, {fail} échecs', flush=True)
    sys.exit(1 if fail else 0)


if __name__ == '__main__':
    asyncio.run(main())
