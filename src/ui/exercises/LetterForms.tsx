import { AudioButton } from '../components/AudioButton'
import { Qcm } from './Qcm'
import { AR_ATTRS } from './types'
import type { ExerciseProps } from './types'

/** QCM sur les lettres arabes (formes / sons) */
export function LetterForms(props: ExerciseProps) {
  const { ex, course } = props
  return (
    <Qcm
      {...props}
      labelClass="arabic"
      labelAttrs={AR_ATTRS}
      header={
        ex.item ? (
          <div style={{ textAlign: 'center', marginTop: 8 }}>
            <AudioButton item={ex.item} course={course} size={24} />
          </div>
        ) : undefined
      }
    />
  )
}
