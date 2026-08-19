"""
Vercel 的 FastAPI 入口。

題目規定不改 server.py。這裡只做兩件事：
1. 把同一個 app 接上 Vercel Services
2. 避開 serverless 沒有共享記憶體：上傳跟 extract 可能打到不同 instance，
   mock 本來就不讀檔，找不到 document_id 仍當成已上傳。
"""
import server as mock_server


class _AnyDocument(dict):
    """看起來還是 dict，但 `id in documents` 永遠為真。"""

    def __contains__(self, key: object) -> bool:
        return True

    def __getitem__(self, key: str) -> str:  # type: ignore[override]
        return dict.get(self, key, "未命名文件")


# extract 讀的是 server.DOCUMENTS 這個名字；換成永遠找得到的版本
mock_server.DOCUMENTS = _AnyDocument()

# Vercel Python runtime 要的是名為 app 的 ASGI 實例
app = mock_server.app
