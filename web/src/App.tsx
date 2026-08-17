import { UploadScreen } from './components/UploadScreen'
import { SubmittedScreen } from './components/SubmittedScreen'
import { Workspace } from './components/Workspace'
import { useReviewSession } from './hooks/useReviewSession'

export default function App() {
  const session = useReviewSession()

  if (session.phase === 'upload') {
    return (
      <UploadScreen
        busy={session.busy}
        notice={session.notice}
        onStart={session.startWithFile}
      />
    )
  }

  if (session.phase === 'submitted') {
    return (
      <SubmittedScreen
        filename={session.filename}
        fields={session.extract.fields}
        onAgain={session.resetToUpload}
      />
    )
  }

  return <Workspace session={session} />
}
