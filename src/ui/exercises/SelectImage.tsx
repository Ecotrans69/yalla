import { Qcm } from './Qcm'
import { targetClass } from './types'
import type { ExerciseProps } from './types'

/** QCM « Comment dit-on … ? » avec emojis */
export function SelectImage(props: ExerciseProps) {
  return <Qcm {...props} labelClass={targetClass(props.course)} />
}
