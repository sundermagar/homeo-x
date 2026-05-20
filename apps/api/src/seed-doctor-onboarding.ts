import { config } from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
config({ path: path.resolve(__dirname, '../../../.env') });
import { eq } from 'drizzle-orm';
import { createDbClient, waAutomations, waChannels } from '@mmc/database';

async function seedDoctorOnboarding() {
  const db = createDbClient(process.env.DATABASE_URL!, 'tenant_demo');
  const clinicId = 1; // Assuming default demo clinic
  const [channel] = await db.select().from(waChannels).limit(1);

  if (!channel) {
    console.error('No WhatsApp channel found in DB.');
    process.exit(1);
  }

  const nodes = [
    {
      id: "start",
      type: "start",
      position: { x: 400, y: 50 },
      data: { kind: "start", label: "Start" }
    },
    {
      id: "node_1",
      type: "user_reply",
      position: { x: 400, y: 200 },
      data: {
        kind: "user_reply",
        label: "Question",
        question: "Welcome to Kreed.health! To begin your onboarding, please provide your Full Name.",
        saveAs: "doctor_name",
        buttons: []
      }
    },
    {
      id: "node_2",
      type: "user_reply",
      position: { x: 400, y: 350 },
      data: {
        kind: "user_reply",
        label: "Question",
        question: "Great to have you. Please provide your Email Address.",
        saveAs: "doctor_email",
        buttons: []
      }
    },
    {
      id: "node_3",
      type: "webhook",
      position: { x: 400, y: 500 },
      data: {
        kind: "webhook",
        label: "Webhook",
        webhookUrl: "https://api.kreed.health/v1/staff",
        webhookMethod: "POST",
        webhookHeaders: { "Content-Type": "application/json" },
        webhookBody: '{"name": "{{doctor_name}}", "email": "{{doctor_email}}", "role": "Doctor", "phone": "{{contact.phone}}"}'
      }
    },
    {
      id: "node_4",
      type: "custom_reply",
      position: { x: 400, y: 650 },
      data: {
        kind: "custom_reply",
        label: "Message",
        message: "Your profile has been created successfully! Download our app and log in using your WhatsApp number.",
        buttons: []
      }
    }
  ];

  const edges = [
    { id: "edge-start-node_1", source: "start", target: "node_1", type: "custom", animated: true },
    { id: "edge-node_1-node_2", source: "node_1", target: "node_2", type: "custom", animated: true },
    { id: "edge-node_2-node_3", source: "node_2", target: "node_3", type: "custom", animated: true },
    { id: "edge-node_3-node_4", source: "node_3", target: "node_4", type: "custom", animated: true }
  ];

  // 1. Clean up existing Doctor Onboarding Flows to prevent duplicates
  await db.delete(waAutomations).where(eq(waAutomations.name, 'Doctor Onboarding Flow'));

  // 2. Insert for null, 0, and 1 to support all access roles
  const clinicIds = [null, 0, 1];
  for (const cId of clinicIds) {
    await db.insert(waAutomations).values({
      clinicId: cId,
      channelId: channel.id,
      name: 'Doctor Onboarding Flow',
      description: 'Automatically onboard new doctors and create their staff profile.',
      trigger: 'keyword',
      triggerConfig: { keywords: ['ONBOARD_DOC', 'JOIN_CLINIC'] },
      status: 'active',
      flowData: { nodes, edges },
      createdBy: 1,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  console.log('✅ Successfully seeded Doctor Onboarding Flow!');
  process.exit(0);
}

seedDoctorOnboarding().catch(console.error);
