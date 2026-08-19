/**
 * 畫面總開關。
 * 沒有用 React Router：流程只有「上傳 → 審核 → 已送出」，再加一頁「已儲存紀錄」。
 * 用 phase + showRecords 切畫面就夠，少一個套件。
 */
import { useState } from 'react'
import { RecordsScreen } from './components/RecordsScreen'
import { UploadScreen } from './components/UploadScreen'
import { SubmittedScreen } from './components/SubmittedScreen'
import { Workspace } from './components/Workspace'
import { useReviewSession } from './hooks/useReviewSession'

export default function App() {
  const session = useReviewSession()
  // 紀錄頁是疊在流程上面的，返回後還會停在原本的 upload / submitted
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

  // working：解析中或審核中，共用 Workspace
  return <Workspace session={session} />
}
