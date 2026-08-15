import { Qcm } from './Qcm'
import { targetClass, targetAttrs } from './types'
import type { ExerciseProps } from './types'

/** Phrase à trou */
export function FillBlank(props: ExerciseProps) {
  return <Qcm {...props} labelClass={targetClass(props.course)}
      labelAttrs={targetAttrs(props.course)} />
}
