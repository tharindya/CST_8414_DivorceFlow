//Frontend page
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Collaboration from '@tiptap/extension-collaboration'
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'

// Local server – change port if you used 4444
const ydoc = new Y.Doc()
const provider = new WebsocketProvider('ws://localhost:5000', 'divorceflow-room', ydoc)

// Debug logging – add this
provider.on('status', ({ status }) => console.log('Yjs status:', status))
provider.on('connect', () => console.log('Yjs connected!'))
provider.on('disconnect', ({ type, reason }) => console.log('Yjs disconnected:', type, reason))
provider.on('error', err => console.error('Yjs error:', err))

const App = () => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ history: false }),
      Collaboration.configure({ document: ydoc }),
    ],
    content: '<p>Welcome to DivorceFlow collaborative editor. Changes sync in real-time!</p><p>Start typing your clauses here...</p>',
  })

  if (!editor) return <div>Loading editor...</div>

  return (
    <div style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto', background: '#fff', color: '#000' }}>
      <h1>DivorceFlow – Secure Agreement Builder</h1>
      <p>Real-time sync test: Open two tabs → type and watch it appear instantly.</p>
      <EditorContent editor={editor} />
    </div>
  )
}

export default App