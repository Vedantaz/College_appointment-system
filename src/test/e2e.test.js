// test/e2e.test.js
const request = require("supertest");
const app = require("../src/app");
const prisma = require("../src/prisma");

jest.setTimeout(30000);

beforeAll(async () => {
  // clear DB
  await prisma.appointment.deleteMany();
  await prisma.availability.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

test("Full booking + cancellation flow (student & professor)", async () => {
  // 1. Register & login professor P1
  const profEmail = "prof1@example.com";
  await request(app)
    .post("/auth/register")
    .send({
      name: "Prof P1",
      email: profEmail,
      password: "pass123",
      role: "PROFESSOR",
    });
  const loginProf = await request(app)
    .post("/auth/login")
    .send({ email: profEmail, password: "pass123" });
  const profToken = loginProf.body.token;
  const profId = loginProf.body.user.id;

  // 2. Register & login Student A1
  const a1Email = "a1@example.com";
  await request(app)
    .post("/auth/register")
    .send({
      name: "Student A1",
      email: a1Email,
      password: "pass123",
      role: "STUDENT",
    });
  const loginA1 = await request(app)
    .post("/auth/login")
    .send({ email: a1Email, password: "pass123" });
  const a1Token = loginA1.body.token;

  // 3. Register & login Student A2
  const a2Email = "a2@example.com";
  await request(app)
    .post("/auth/register")
    .send({
      name: "Student A2",
      email: a2Email,
      password: "pass123",
      role: "STUDENT",
    });
  const loginA2 = await request(app)
    .post("/auth/login")
    .send({ email: a2Email, password: "pass123" });
  const a2Token = loginA2.body.token;

  // 4. Professor creates two availability slots (T1, T2)
  const now = Date.now();
  const T1 = new Date(now + 60 * 60 * 1000).toISOString(); // +1 hour
  const T2 = new Date(now + 2 * 60 * 60 * 1000).toISOString(); // +2 hours
  const T1end = new Date(now + 60 * 60 * 1000 + 30 * 60 * 1000).toISOString();
  const T2end = new Date(
    now + 2 * 60 * 60 * 1000 + 30 * 60 * 1000
  ).toISOString();

  const slot1 = await request(app)
    .post("/availability")
    .set("Authorization", `Bearer ${profToken}`)
    .send({ start: T1, end: T1end });
  expect(slot1.status).toBe(201);
  const slot2 = await request(app)
    .post("/availability")
    .set("Authorization", `Bearer ${profToken}`)
    .send({ start: T2, end: T2end });
  expect(slot2.status).toBe(201);

  // 5. Student A1 views available slots and books T1
  const availList = await request(app).get(
    `/professors/${profId}/availability`
  );
  expect(availList.status).toBe(200);
  const availabilityIdT1 = availList.body[0].id;
  const bookA1 = await request(app)
    .post("/appointments/book")
    .set("Authorization", `Bearer ${a1Token}`)
    .send({ availabilityId: availabilityIdT1 });
  expect(bookA1.status).toBe(201);
  const apptA1 = bookA1.body;

  // 6. Student A2 books T2
  const availabilityIdT2 = availList.body[1].id;
  const bookA2 = await request(app)
    .post("/appointments/book")
    .set("Authorization", `Bearer ${a2Token}`)
    .send({ availabilityId: availabilityIdT2 });
  expect(bookA2.status).toBe(201);
  const apptA2 = bookA2.body;

  // 7. Professor cancels appointment with Student A1
  const cancel = await request(app)
    .post(`/appointments/${apptA1.id}/cancel`)
    .set("Authorization", `Bearer ${profToken}`)
    .send();
  expect(cancel.status).toBe(200);
  expect(cancel.body.status).toBe("CANCELLED");

  // 8. Student A1 checks their appointments and should have no active BOOKED appointments
  const myA1 = await request(app)
    .get("/appointments/my")
    .set("Authorization", `Bearer ${a1Token}`);
  expect(myA1.status).toBe(200);
  // we return only BOOKED in /my for student, so after cancel they should have zero
  expect(myA1.body.length).toBe(0);
});
