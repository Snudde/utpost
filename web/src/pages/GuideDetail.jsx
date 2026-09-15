import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

const GuideDetail = () => {
  const { slug } = useParams();
  const [guide, setGuide] = useState(null);

  useEffect(() => {
    fetch(`http://localhost:4000/api/guides/${slug}`)
      .then((r) => r.json())
      .then(setGuide);
  }, [slug]);

  if (!guide) return <p>Laddar...</p>;

  return (
    <article className="guide">
      <h1>{guide.title}</h1>
      <p className="muted">{guide.region} · {guide.difficulty} · {guide.length_km} km</p>
      <div dangerouslySetInnerHTML={{ __html: guide.body_html }} />
    </article>
  );
};

export default GuideDetail;
