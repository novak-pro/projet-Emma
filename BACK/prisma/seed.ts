import "dotenv/config";
import { DamageType, PrismaClient, ReportStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const cities = [
  { city: "Yaoundé", region: "Centre", lat: 3.848, lng: 11.502 },
  { city: "Douala", region: "Littoral", lat: 4.0511, lng: 9.7679 },
  { city: "Bafoussam", region: "Ouest", lat: 5.4781, lng: 10.4176 },
  { city: "Bamenda", region: "Nord-Ouest", lat: 5.9631, lng: 10.1591 },
  { city: "Garoua", region: "Nord", lat: 9.3265, lng: 13.3958 },
  { city: "Maroua", region: "Extrême-Nord", lat: 10.591, lng: 14.3159 },
  { city: "Ngaoundéré", region: "Adamaoua", lat: 7.3167, lng: 13.5833 },
  { city: "Bertoua", region: "Est", lat: 4.5771, lng: 13.6846 },
  { city: "Ebolowa", region: "Sud", lat: 2.9, lng: 11.15 },
  { city: "Kribi", region: "Sud", lat: 2.9391, lng: 9.9107 },
  { city: "Limbé", region: "Sud-Ouest", lat: 4.0228, lng: 9.1955 },
  { city: "Buéa", region: "Sud-Ouest", lat: 4.1527, lng: 9.241 },
  { city: "Nkongsamba", region: "Littoral", lat: 4.9547, lng: 9.9404 },
  { city: "Foumban", region: "Ouest", lat: 5.7167, lng: 10.9167 },
  { city: "Édéa", region: "Littoral", lat: 3.8, lng: 10.1333 },
  { city: "Sangmélima", region: "Sud", lat: 2.9333, lng: 11.9833 },
  { city: "Mbalmayo", region: "Centre", lat: 3.5167, lng: 11.5 },
  { city: "Dschang", region: "Ouest", lat: 5.45, lng: 10.05 },
  { city: "Bafang", region: "Ouest", lat: 5.157, lng: 10.183 },
  { city: "Kousséri", region: "Extrême-Nord", lat: 12.0769, lng: 15.0306 },
];

const roads = [
  "Nationale N1",
  "Nationale N3",
  "Nationale N4",
  "Axe lourd Douala-Yaoundé",
  "Route de Nkolbisson",
  "Avenue Charles de Gaulle",
  "Boulevard de la Réunification",
  "Route de Bafoussam",
  "Pénétrante Est",
  "Route rurale",
];

const damageTypes = Object.values(DamageType);
const statuses = [
  ReportStatus.NOUVEAU,
  ReportStatus.NOUVEAU,
  ReportStatus.NOUVEAU,
  ReportStatus.CONFIRME,
  ReportStatus.CONFIRME,
  ReportStatus.EN_REPARATION,
  ReportStatus.REPARE,
  ReportStatus.REJETE,
];

const descriptions = [
  "Nid-de-poule profond sur la voie de droite, dangereux pour les motos.",
  "Chaussée fissurée sur plusieurs mètres après le carrefour.",
  "Affaissement important causé par les pluies, circulation difficile.",
  "Ornières marquées sur l'axe, les véhicules évitent la voie.",
  "Érosion de la chaussée en bordure, risque d'effondrement.",
  "Dégradation avancée, plusieurs accidents signalés.",
  "Trou comblé temporairement mais qui se reforme.",
  "Route dégradée sur environ 50 mètres, nids-de-poule successifs.",
];

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

async function main() {
  const email = (process.env.ADMIN_EMAIL ?? "admin@admin.cm").toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? "admin123";
  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.admin.upsert({
    where: { email },
    update: {},
    create: { email, passwordHash, name: "Administrateur" },
  });

  if (process.env.SEED_SAMPLES !== "false") {
    const existing = await prisma.report.count();
    if (existing === 0) {
      const random = mulberry32(42);
      const now = Date.now();
      const samples = Array.from({ length: 60 }).map(() => {
        const base = cities[Math.floor(random() * cities.length)];
        const daysAgo = Math.floor(random() * 180);
        return {
          latitude: base.lat + (random() - 0.5) * 0.08,
          longitude: base.lng + (random() - 0.5) * 0.08,
          region: base.region,
          city: base.city,
          roadName: roads[Math.floor(random() * roads.length)],
          damageType: damageTypes[Math.floor(random() * damageTypes.length)],
          sizeEstimate: Math.round((random() * 12 + 0.5) * 10) / 10,
          description: descriptions[Math.floor(random() * descriptions.length)],
          status: statuses[Math.floor(random() * statuses.length)],
          createdAt: new Date(now - daysAgo * 24 * 60 * 60 * 1000),
        };
      });
      await prisma.report.createMany({ data: samples });
      console.log(`Données de démonstration créées : ${samples.length} signalements`);
    }
  }

  console.log(`Administrateur prêt : ${email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
