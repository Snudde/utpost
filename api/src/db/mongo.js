import { MongoClient } from 'mongodb';
import { config } from '../config.js';

// En klient för hela processen – drivern håller en pool av anslutningar själv.
// Databasnamnet ("utpost") kommer från adressen i config.
// serverSelectionTimeoutMS: ge upp efter 3 s i stället för 30 om Mongo inte svarar.
export const mongo = new MongoClient(config.mongoUrl, { serverSelectionTimeoutMS: 3000 });
export const mongoDb = () => mongo.db();

// Dokumentmodellen för turer (beslutad i M3, migreringen görs i M5):
// en tur = ett dokument, med mätpunkterna inbäddade i arrayen `logs`.
// Läses alltid ihop, skrivs en gång, ca 300 punkter per tur = ett par tiotal kB.
export const toursCollection = () => mongoDb().collection('tours');
