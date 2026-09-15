import { Link } from 'react-router-dom';

const GuideCard = ({ guide }) => (
  <div className="card" style={{ border: '1px solid #ddd', padding: 12, borderRadius: 4 }}>
    <h3><Link to={`/guider/${guide.slug}`}>{guide.title}</Link></h3>
    <p className="muted">{guide.region} · {guide.difficulty} · {guide.length_km} km</p>
    <div
      className="excerpt"
      dangerouslySetInnerHTML={{ __html: guide.body_html.slice(0, 180) }}
    />
  </div>
);

export default GuideCard;
