import { useState } from 'react';
import { Download } from 'lucide-react';
import { downloadImportTemplate } from '../lib/api';
import { Button } from './ui';

export default function DownloadTemplate({ type }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  async function download() {
    setLoading(true);
    setError('');
    try { await downloadImportTemplate(type); }
    catch (error) { setError(error.message); }
    finally { setLoading(false); }
  }
  return <div><Button variant="secondary" loading={loading} onClick={download}><Download size={17}/>Download template</Button>{error && <p role="alert" className="text-sm text-red-700">{error}</p>}</div>;
}
