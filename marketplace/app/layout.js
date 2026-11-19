import '@fontsource-variable/manrope';
import './style.css';
export const metadata = {title:'SWABHIMAN | Local work marketplace',description:'Find skilled workers and local jobs in Chhatrapati Sambhajinagar.',icons:{icon:'/swabhiman-mark.svg'}};
export default function Layout({children}) {
  return <html lang="en"><body>{children}</body></html>;
}