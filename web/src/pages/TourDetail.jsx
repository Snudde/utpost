import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

const TourDetail = () => {
  const { id } = useParams();
  const [tour, setTour] = useState(null);

  useEffect(() => {
    fetch(`http://localhost:4000/api/tours/${id}`)
      .then((r) => r.json())
      .then(setTour);
  }, [id]);

  if (!tour) return <p>Laddar...</p>;

  const climb = tour.logs.reduce((sum, log, i) => {
    if (i === 0) return 0;
    const diff = log.elevation_m - tour.logs[i - 1].elevation_m;
    return diff > 0 ? sum + diff : sum;
  }, 0);

  return (
    <div>
      <h1>{tour.title}</h1>
      <p className="muted">
        {Math.round(tour.distance_m / 100) / 10} km · {tour.logs.length} mätpunkter · {climb} höjdmeter
      </p>
      {tour.notes ? <p>{tour.notes}</p> : null}
      <h2>Mätpunkter</h2>
      <ol className="logs">
        {tour.logs.map((log) => (
          <li key={log.id}>
            {new Date(log.recorded_at).toLocaleTimeString('sv-SE')} · {log.elevation_m} m · {log.heart_rate} slag/min
          </li>
        ))}
      </ol>
    </div>
  );
};

export default TourDetail;
