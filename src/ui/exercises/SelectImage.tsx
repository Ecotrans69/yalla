import { Qcm } from './Qcm'
import { targetClass, targetAttrs } from './types'
import type { ExerciseProps } from './types'

/** QCM « Comment dit-on … ? » avec emojis */
export function SelectImage(props: ExerciseProps) {
  return <Qcm {...props} labelClass={targetClass(props.course)}
      labelAttrs={targetAttrs(props.course)} />
}
