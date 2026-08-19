/**
 * 畫面總開關。
 * 沒有用 React Router：流程只有「上傳 → 審核 → 已送出」，
 * 再疊「已儲存紀錄」或「測試報告」。用 overlay 切，少一個套件。
 */
import { useState } from 'react'
import { RecordsScreen } from './components/RecordsScreen'
import { TestReportScreen } from './components/TestReportScreen'
import { UploadScreen } from './components/UploadScreen'
import { SubmittedScreen } from './components/SubmittedScreen'
import { Workspace } from './components/Workspace'
import { useReviewSession } from './hooks/useReviewSession'

type Overlay = 'none' | 'records' | 'tests'

export default function App() {
  const session = useReviewSession()
  // 疊在流程上面；返回後還會停在原本的 upload / submitted
  const [overlay, setOverlay] = useState<Overlay>('none')

  if (overlay === 'records') {
    return <RecordsScreen onBack={() => setOverlay('none')} />
  }

  if (overlay === 'tests') {
    return <TestReportScreen onBack={() => setOverlay('none')} />
  }

  if (session.phase === 'upload') {
    return (
      <UploadScreen
        busy={session.busy}
        notice={session.notice}
        onStart={session.startWithFile}
        onViewRecords={() => setOverlay('records')}
        onViewTests={() => setOverlay('tests')}
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
        onViewRecords={() => setOverlay('records')}
      />
    )
  }

  // working：解析中或審核中，共用 Workspace
  return <Workspace session={session} />
}
