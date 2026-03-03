/**
 * Aurora Health AI Engine
 * Uses OpenAI if OPENAI_API_KEY is set, otherwise falls back to rule-based logic.
 */

let openaiClient = null;

const getOpenAIClient = () => {
  const key = (process.env.OPENAI_API_KEY || '').trim();
  if (!openaiClient && key) {
    const { OpenAI } = require('openai');
    openaiClient = new OpenAI({
      apiKey: key,
      timeout: 30000,
      maxRetries: 2,
    });
  }
  return openaiClient;
};

const callOpenAI = async (systemPrompt, userContent) => {
  const client = getOpenAIClient();
  if (!client) {
    console.error('OpenAI client not initialized — OPENAI_API_KEY missing or empty');
    return null;
  }

  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      temperature: 0.3,
      max_tokens: 600,
    });
    return response.choices[0].message.content.trim();
  } catch (err) {
    console.error('OpenAI call failed:', err.message);
    if (err.status) console.error('  Status:', err.status, '| Type:', err.type);
    return null;
  }
};

// ─────────────────────────────────────────────
// 1. Summarize Patient History
// ─────────────────────────────────────────────
const summarizeHistory = async (patient_history) => {
  const systemPrompt = `You are a clinical AI assistant.
Summarize the following patient medical history into:
- Current primary condition
- Key past conditions
- Current medications
- Risk factors
- Any follow-up recommendations
Keep it short, clear, and structured for a doctor.`;

  const aiResult = await callOpenAI(systemPrompt, patient_history);
  if (aiResult) return aiResult;

  // Rule-based fallback
  const lines = patient_history.split(/[.\n]+/).filter(Boolean);
  const conditions = lines.filter((l) =>
    /diagnosed|condition|disorder|disease|chronic|acute/i.test(l)
  );
  const meds = lines.filter((l) => /medication|prescribed|drug|tablet|mg|capsule/i.test(l));
  const risks = lines.filter((l) => /risk|history of|family|smoking|alcohol|obese|hypertension|diabetes/i.test(l));

  return [
    '**Current Primary Condition:**',
    conditions.length ? conditions[0] : 'Refer to full notes.',
    '',
    '**Key Past Conditions:**',
    conditions.length > 1 ? conditions.slice(1, 3).join('; ') : 'Not clearly specified.',
    '',
    '**Current Medications:**',
    meds.length ? meds.slice(0, 3).join('; ') : 'Not mentioned.',
    '',
    '**Risk Factors:**',
    risks.length ? risks.slice(0, 3).join('; ') : 'No specific risk factors identified.',
    '',
    '**Follow-up Recommendations:**',
    'Schedule follow-up visit within 1-2 weeks. Review medication effectiveness.',
  ].join('\n');
};

// ─────────────────────────────────────────────
// 2. Simplify Discharge Instructions
// ─────────────────────────────────────────────
const simplifyDischarge = async (discharge_text) => {
  const systemPrompt = `You are a healthcare assistant helping patients understand medical instructions.
Rewrite the following discharge summary in very simple English.
Use short sentences. Avoid medical jargon. Explain what the patient should do clearly.
Add bullet points if helpful.`;

  const aiResult = await callOpenAI(systemPrompt, discharge_text);
  if (aiResult) return aiResult;

  // Rule-based fallback: strip jargon patterns and reformat
  const simplified = discharge_text
    .replace(/administered/gi, 'given')
    .replace(/contraindicated/gi, 'not allowed')
    .replace(/ambulatory/gi, 'able to walk')
    .replace(/oral intake/gi, 'eating and drinking')
    .replace(/prognosis/gi, 'expected recovery')
    .replace(/etiology/gi, 'cause')
    .replace(/exacerbation/gi, 'worsening')
    .replace(/hypertension/gi, 'high blood pressure')
    .replace(/myocardial infarction/gi, 'heart attack')
    .replace(/cerebrovascular accident/gi, 'stroke')
    .replace(/dyspnea/gi, 'shortness of breath')
    .replace(/febrile/gi, 'having a fever')
    .replace(/bilateral/gi, 'both sides')
    .replace(/tachycardia/gi, 'fast heartbeat');

  return `Here is what you need to know after leaving the hospital:\n\n${simplified}\n\n**Important reminders:**\n- Take your medicines exactly as told.\n- Rest and do not overdo activities.\n- Come back to the hospital immediately if you feel worse.\n- Attend all your follow-up appointments.`;
};

// ─────────────────────────────────────────────
// 3. Predict Readmission Risk
// ─────────────────────────────────────────────
const predictReadmissionRisk = (age, conditions = [], previous_admissions = 0, medication_count = 0) => {
  let score = 0;

  // Age factor
  if (age >= 75) score += 0.30;
  else if (age >= 65) score += 0.20;
  else if (age >= 50) score += 0.10;

  // Admission history
  if (previous_admissions >= 4) score += 0.30;
  else if (previous_admissions >= 2) score += 0.20;
  else if (previous_admissions === 1) score += 0.10;

  // Medication complexity
  if (medication_count >= 7) score += 0.20;
  else if (medication_count >= 5) score += 0.15;
  else if (medication_count >= 3) score += 0.08;

  // Chronic conditions
  const chronicKeywords = ['hypertension', 'diabetes', 'heart failure', 'copd', 'kidney', 'cancer', 'stroke', 'dementia', 'depression'];
  const conditionText = conditions.join(' ').toLowerCase();
  const matchedChronic = chronicKeywords.filter((k) => conditionText.includes(k));
  score += Math.min(matchedChronic.length * 0.08, 0.24);

  score = Math.min(parseFloat(score.toFixed(2)), 1.0);

  let risk_level, recommendation;
  if (score >= 0.60) {
    risk_level = 'High';
    recommendation = 'Schedule follow-up within 48 hours. Consider home health monitoring and medication review.';
  } else if (score >= 0.30) {
    risk_level = 'Medium';
    recommendation = 'Schedule follow-up within 1 week. Ensure medication compliance and patient education.';
  } else {
    risk_level = 'Low';
    recommendation = 'Routine follow-up in 2-4 weeks. Standard discharge instructions apply.';
  }

  return { risk_score: score, risk_level, recommendation };
};

// ─────────────────────────────────────────────
// 4. Generate Nurse Tasks from Diagnosis
// ─────────────────────────────────────────────
const generateNurseTasks = async (diagnosis) => {
  const systemPrompt = `You are a hospital care assistant.
Based on the patient condition below, generate:
- Monitoring tasks
- Frequency of monitoring
- Warning signs to watch
Keep it practical and clear for nurses. Format as a structured list.`;

  const aiResult = await callOpenAI(systemPrompt, diagnosis);
  if (aiResult) return aiResult;

  // Rule-based fallback
  const tasks = ['Monitor vital signs (blood pressure, heart rate, temperature, SpO2)'];
  const warnings = ['Sudden drop in blood pressure', 'Heart rate above 120 or below 50', 'Temperature above 38.5°C'];
  let frequency = 'Every 4 hours';

  if (/cardiac|heart/i.test(diagnosis)) {
    tasks.push('ECG monitoring', 'Fluid intake/output tracking', 'Administer cardiac medications as prescribed');
    warnings.push('Chest pain or pressure', 'Irregular heartbeat');
    frequency = 'Every 2 hours';
  }
  if (/diabetes|glucose|insulin/i.test(diagnosis)) {
    tasks.push('Blood glucose monitoring', 'Insulin administration as prescribed', 'Foot care and inspection');
    warnings.push('Blood glucose below 70 mg/dL (hypoglycemia)', 'Blood glucose above 300 mg/dL');
  }
  if (/respiratory|breathing|lung|copd|pneumonia/i.test(diagnosis)) {
    tasks.push('Oxygen saturation monitoring', 'Breathing exercises assistance', 'Nebulization as prescribed');
    warnings.push('SpO2 below 92%', 'Rapid breathing above 30/min', 'Cyanosis (bluish discoloration)');
    frequency = 'Every 2 hours';
  }
  if (/stroke|neuro|brain/i.test(diagnosis)) {
    tasks.push('Neurological status check (GCS)', 'Pupil response check', 'Fall prevention measures');
    warnings.push('Sudden change in consciousness', 'Pupil inequality', 'New onset weakness or slurred speech');
  }

  return {
    monitoring_tasks: tasks,
    frequency,
    warning_signs: warnings,
  };
};

// ─────────────────────────────────────────────
// 5. AI Suggest Diagnosis from Symptoms
// ─────────────────────────────────────────────
const suggestDiagnosis = async (symptoms) => {
  const systemPrompt = `You are a clinical decision-support AI. Given the patient symptoms, respond ONLY with valid JSON (no markdown, no backticks). Format:
{
  "diagnoses": [
    { "name": "Diagnosis Name", "reason": "Short one-line reason" }
  ]
}
Suggest the top 3 most likely diagnoses. Be concise and practical.`;
  const aiResult = await callOpenAI(systemPrompt, `Patient symptoms: ${symptoms}`);
  if (aiResult) {
    try {
      const cleaned = aiResult.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      return JSON.parse(cleaned);
    } catch {
      return { diagnoses: [{ name: aiResult.split('\n')[0].replace(/^[\d.\-*]+\s*/, ''), reason: '' }] };
    }
  }
  return { diagnoses: [] };
};

// ─────────────────────────────────────────────
// 6. AI Suggest Prescription from Diagnosis
// ─────────────────────────────────────────────
const suggestPrescription = async (diagnosis, symptoms) => {
  const systemPrompt = `You are a clinical pharmacology AI assistant. Given the diagnosis and symptoms, respond ONLY with valid JSON (no markdown, no backticks). Format:
{
  "medicines": [
    { "medication_name": "Medicine Name", "dosage": "e.g. 500mg", "frequency": "e.g. Twice daily", "duration": "e.g. 5 days" }
  ]
}
Suggest 2-4 commonly prescribed medicines. Be practical and evidence-based.`;
  const aiResult = await callOpenAI(systemPrompt, `Diagnosis: ${diagnosis}\nSymptoms: ${symptoms || 'Not specified'}`);
  if (aiResult) {
    try {
      const cleaned = aiResult.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      return JSON.parse(cleaned);
    } catch {
      return { medicines: [], raw: aiResult };
    }
  }
  return { medicines: [] };
};

// ─────────────────────────────────────────────
// 7. AI Generate Consultation Document
// ─────────────────────────────────────────────
const generateConsultationDoc = async (caseInfo) => {
  const systemPrompt = `You are a medical documentation AI. Generate a professional consultation document based on the case details provided. Include:
- Patient complaint / reason for visit
- Symptoms noted
- Diagnosis
- Examination notes
- Prescribed medications (if any)
- Lab tests ordered (if any)
- Plan / Next steps
Format it as a clean, structured clinical document. Keep it concise but thorough.`;
  const aiResult = await callOpenAI(systemPrompt, JSON.stringify(caseInfo));
  if (aiResult) return aiResult;

  // Fallback
  const lines = [
    `CONSULTATION DOCUMENT`,
    `Date: ${new Date().toLocaleDateString()}`,
    ``,
    `Reason for Visit: ${caseInfo.title || 'General Consultation'}`,
    `Diagnosis: ${caseInfo.diagnosis || 'Pending'}`,
  ];
  if (caseInfo.symptoms?.length) lines.push(`Symptoms: ${caseInfo.symptoms.join(', ')}`);
  if (caseInfo.prescriptions?.length) {
    lines.push(`\nPrescriptions:`);
    caseInfo.prescriptions.forEach(p => lines.push(`  - ${p.medication_name} ${p.dosage} ${p.frequency} ${p.duration}`));
  }
  if (caseInfo.lab_tests?.length) {
    lines.push(`\nLab Tests Ordered:`);
    caseInfo.lab_tests.forEach(t => lines.push(`  - ${t.name} (${t.status})`));
  }
  lines.push(`\nDoctor Notes: ${caseInfo.notes || 'None'}`);
  return lines.join('\n');
};

// ─────────────────────────────────────────────
// 8. AI Lab Priority Assessment
// ─────────────────────────────────────────────
const assessLabPriority = async (testName, diagnosis, symptoms) => {
  const systemPrompt = `You are a lab triage AI. Given the test, diagnosis, and symptoms, respond with ONLY one word: "normal", "urgent", or "critical". Nothing else.`;
  const aiResult = await callOpenAI(systemPrompt, `Test: ${testName}\nDiagnosis: ${diagnosis || 'Unknown'}\nSymptoms: ${symptoms || 'Unknown'}`);
  if (aiResult) {
    const lower = aiResult.toLowerCase().trim();
    if (['normal', 'urgent', 'critical'].includes(lower)) return lower;
  }
  return 'normal';
};

// ─────────────────────────────────────────────
// 9. AI Billing Anomaly Check
// ─────────────────────────────────────────────
const checkBillingAnomaly = async (billingInfo) => {
  const systemPrompt = `You are a hospital billing audit AI. Analyze the billing breakdown and flag any anomalies or unusual charges. Be concise. If everything looks normal, say "No anomalies detected." Format as bullet points if there are issues.`;
  const aiResult = await callOpenAI(systemPrompt, JSON.stringify(billingInfo));
  if (aiResult) return aiResult;
  return 'AI unavailable for billing audit.';
};

// ─────────────────────────────────────────────
// 10. AI Summarize Past Cases for Doctor
// ─────────────────────────────────────────────
const summarizePastCases = async (casesData) => {
  const systemPrompt = `You are a clinical AI assistant helping a doctor quickly understand a patient's medical history from their past hospital cases. Summarize the following past cases into a structured overview:
- Recurring conditions or patterns
- All diagnoses so far
- Medications prescribed across visits
- Lab tests done and key findings
- Risk factors or concerns
- Recommendations for current visit
Be concise, practical, and structured with bullet points. This is for the doctor's quick reference.`;
  const aiResult = await callOpenAI(systemPrompt, JSON.stringify(casesData));
  if (aiResult) return aiResult;
  return 'AI unavailable. Review past cases manually.';
};

module.exports = { summarizeHistory, simplifyDischarge, predictReadmissionRisk, generateNurseTasks, suggestDiagnosis, suggestPrescription, generateConsultationDoc, assessLabPriority, checkBillingAnomaly, summarizePastCases };
