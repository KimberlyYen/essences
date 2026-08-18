import { useState } from 'react'
import { RecordsScreen } from './components/RecordsScreen'
import { UploadScreen } from './components/UploadScreen'
import { SubmittedScreen } from './components/SubmittedScreen'
import { Workspace } from './components/Workspace'
import { useReviewSession } from './hooks/useReviewSession'

export default function App() {
  const session = useReviewSession()
  const [showRecords, setShowRecords] = useState(false)

  if (showRecords) {
    return <RecordsScreen onBack={() => setShowRecords(false)} />
  }

  if (session.phase === 'upload') {
    return (
      <UploadScreen
        busy={session.busy}
        notice={session.notice}
        onStart={session.startWithFile}
        onViewRecords={() => setShowRecords(true)}
      />
    )
  }

  if (session.phase === 'submitted') {
    return (
      <SubmittedScreen
        filename={session.filename}
        fields={session.extract.fields}
        saved={session.savedReview}
        onAgain={session.resetToUpload}
        onViewRecords={() => setShowRecords(true)}
      />
    )
  }

  return <Workspace session={session} />
}
