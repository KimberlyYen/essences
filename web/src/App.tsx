/**
 * 畫面總開關。
 * 沒有用 React Router：流程只有「上傳 → 審核 → 已送出」，
 * 再疊「已儲存紀錄」或「測試報告」。用 overlay 切，少一個套件。
 */
import { useState, type ReactNode } from 'react'
import { RecordsScreen } from './components/RecordsScreen'
import { SkipLink } from './components/SkipLink'
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

  let screen: ReactNode

  if (overlay === 'records') {
    screen = <RecordsScreen onBack={() => setOverlay('none')} />
  } else if (overlay === 'tests') {
    screen = <TestReportScreen onBack={() => setOverlay('none')} />
  } else if (session.phase === 'upload') {
    screen = (
      <UploadScreen
        busy={session.busy}
        notice={session.notice}
        onStart={session.startWithFile}
        onViewRecords={() => setOverlay('records')}
        onViewTests={() => setOverlay('tests')}
      />
    )
  } else if (session.phase === 'submitted') {
    screen = (
      <SubmittedScreen
        filename={session.filename}
        fields={session.extract.fields}
        saved={session.savedReview}
        onAgain={session.resetToUpload}
        onViewRecords={() => setOverlay('records')}
      />
    )
  } else {
    // working：解析中或審核中，共用 Workspace
    screen = <Workspace session={session} />
  }

  return (
    <>
      <SkipLink />
      {screen}
    </>
  )
}
