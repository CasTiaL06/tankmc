import hero from '../assets/hero.jpg'

const POS = ['75% 30%', '92% 15%', '60% 45%', '85% 60%']
const hash = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7)
// Sayfa başlığı: tasarımdaki gibi kale sanatlı afiş; her sayfa görselin farklı bölümünü gösterir
export default function PageHead({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="ph" style={{ backgroundImage: `linear-gradient(90deg, rgba(8,8,10,.97) 30%, rgba(8,8,10,.5) 68%, rgba(8,8,10,.15)), url(${hero})`, backgroundSize: 'cover', backgroundPosition: `center, ${POS[hash(title) % 4]}` }}>
      <div><h1>{title}</h1>{sub && <p className="sub">{sub}</p>}</div>
    </div>
  )
}
