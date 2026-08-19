/**
 * 鍵盤使用者進頁後第一個焦點：跳過導覽，直接到主要內容。
 * 平常視覺隱藏，Tab 到才出現。
 */
export function SkipLink() {
  return (
    <a href="#main" className="skip-link">
      跳到主要內容
    </a>
  )
}
