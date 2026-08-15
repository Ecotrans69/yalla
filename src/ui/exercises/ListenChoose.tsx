import { AudioButton } from '../components/AudioButton'
import { Qcm } from './Qcm'
import { targetClass, targetAttrs } from './types'
import type { ExerciseProps } from './types'

/** Écoute puis choisis ce que tu as entendu */
export function ListenChoose(props: ExerciseProps) {
  const { ex, course } = props
  return (
    <Qcm
      {...props}
      labelClass={targetClass(course)}
      labelAttrs={targetAttrs(course)}
      header={
        <div style={{ textAlign: 'center', marginTop: 8 }}>
          <AudioButton item={ex.item!} course={course} autoPlay size={36} />
        </div>
      }
    />
  )
}
