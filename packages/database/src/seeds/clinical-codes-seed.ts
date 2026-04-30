import { eq, sql } from 'drizzle-orm';
import type { DbClient } from '../client';
import {
  icdCodes,
  loincCodes,
  procedureCodes,
  codeMappings,
  labPanels,
  labPanelLoincLinks,
} from '../schema/clinical-codes';

// ─── ICD-10 Common Codes ──────────────────────────────────────────────────────
const icd10Seed = [
  // Chapter I: Infectious diseases (A00-B99)
  { code: 'A00', description: 'Cholera', chapter: 'I', category: 'Infectious diseases' },
  { code: 'A09', description: 'Infectious gastroenteritis and colitis', chapter: 'I', category: 'Infectious diseases' },
  { code: 'A37', description: 'Whooping cough', chapter: 'I', category: 'Infectious diseases' },
  { code: 'A38', description: 'Scarlet fever', chapter: 'I', category: 'Infectious diseases' },
  { code: 'A39', description: 'Meningococcal infection', chapter: 'I', category: 'Infectious diseases' },
  { code: 'A49', description: 'Bacterial infection of unspecified site', chapter: 'I', category: 'Infectious diseases' },

  // Chapter VI: Nervous system (G00-G99)
  { code: 'G40', description: 'Epilepsy', chapter: 'VI', category: 'Nervous system' },
  { code: 'G43', description: 'Migraine', chapter: 'VI', category: 'Nervous system' },
  { code: 'G44', description: 'Tension headache', chapter: 'VI', category: 'Nervous system' },
  { code: 'G47', description: 'Sleep disorders', chapter: 'VI', category: 'Nervous system' },
  { code: 'G50', description: 'Disorders of trigeminal nerve', chapter: 'VI', category: 'Nervous system' },
  { code: 'G54', description: 'Nerve root and plexus disorders', chapter: 'VI', category: 'Nervous system' },

  // Chapter VII: Eye (H00-H59)
  { code: 'H10', description: 'Conjunctivitis', chapter: 'VII', category: 'Eye' },
  { code: 'H11', description: 'Other disorders of conjunctiva', chapter: 'VII', category: 'Eye' },
  { code: 'H25', description: 'Cataract', chapter: 'VII', category: 'Eye' },
  { code: 'H52', description: 'Disorders of refraction and accommodation', chapter: 'VII', category: 'Eye' },

  // Chapter VIII: Ear (H60-H95)
  { code: 'H60', description: 'Otitis externa', chapter: 'VIII', category: 'Ear' },
  { code: 'H65', description: 'Non-suppurative otitis media', chapter: 'VIII', category: 'Ear' },
  { code: 'H66', description: 'Suppurative otitis media', chapter: 'VIII', category: 'Ear' },
  { code: 'H91', description: 'Other hearing loss', chapter: 'VIII', category: 'Ear' },

  // Chapter IX: Circulatory (I00-I99)
  { code: 'I10', description: 'Essential (primary) hypertension', chapter: 'IX', category: 'Circulatory' },
  { code: 'I25', description: 'Chronic ischemic heart disease', chapter: 'IX', category: 'Circulatory' },
  { code: 'I48', description: 'Atrial fibrillation and flutter', chapter: 'IX', category: 'Circulatory' },
  { code: 'I50', description: 'Heart failure', chapter: 'IX', category: 'Circulatory' },
  { code: 'I64', description: 'Stroke, not specified as hemorrhage or infarction', chapter: 'IX', category: 'Circulatory' },

  // Chapter X: Respiratory (J00-J99)
  { code: 'J00', description: 'Acute nasopharyngitis (common cold)', chapter: 'X', category: 'Respiratory' },
  { code: 'J02', description: 'Acute pharyngitis', chapter: 'X', category: 'Respiratory' },
  { code: 'J03', description: 'Acute tonsillitis', chapter: 'X', category: 'Respiratory' },
  { code: 'J06', description: 'Acute upper respiratory infections, multiple sites', chapter: 'X', category: 'Respiratory' },
  { code: 'J18', description: 'Pneumonia, unspecified organism', chapter: 'X', category: 'Respiratory' },
  { code: 'J20', description: 'Acute bronchitis', chapter: 'X', category: 'Respiratory' },
  { code: 'J30', description: 'Vasomotor and allergic rhinitis', chapter: 'X', category: 'Respiratory' },
  { code: 'J31', description: 'Chronic rhinitis, nasopharyngitis and pharyngitis', chapter: 'X', category: 'Respiratory' },
  { code: 'J32', description: 'Chronic sinusitis', chapter: 'X', category: 'Respiratory' },
  { code: 'J33', description: 'Nasal polyp', chapter: 'X', category: 'Respiratory' },
  { code: 'J34', description: 'Other disorders of nose and nasal sinuses', chapter: 'X', category: 'Respiratory' },
  { code: 'J40', description: 'Bronchitis, not specified as acute or chronic', chapter: 'X', category: 'Respiratory' },
  { code: 'J42', description: 'Unspecified chronic bronchitis', chapter: 'X', category: 'Respiratory' },
  { code: 'J43', description: 'Emphysema', chapter: 'X', category: 'Respiratory' },
  { code: 'J44', description: 'Other chronic obstructive pulmonary disease', chapter: 'X', category: 'Respiratory' },
  { code: 'J45', description: 'Asthma', chapter: 'X', category: 'Respiratory' },
  { code: 'J46', description: 'Status asthmaticus', chapter: 'X', category: 'Respiratory' },

  // Chapter XI: Digestive (K00-K93)
  { code: 'K02', description: 'Dental caries', chapter: 'XI', category: 'Digestive' },
  { code: 'K04', description: 'Diseases of pulp and periapical tissues', chapter: 'XI', category: 'Digestive' },
  { code: 'K08', description: 'Other disorders of teeth and supporting structures', chapter: 'XI', category: 'Digestive' },
  { code: 'K20', description: 'Esophagitis', chapter: 'XI', category: 'Digestive' },
  { code: 'K21', description: 'Gastro-esophageal reflux disease', chapter: 'XI', category: 'Digestive' },
  { code: 'K25', description: 'Gastric ulcer', chapter: 'XI', category: 'Digestive' },
  { code: 'K26', description: 'Duodenal ulcer', chapter: 'XI', category: 'Digestive' },
  { code: 'K27', description: 'Peptic ulcer, site unspecified', chapter: 'XI', category: 'Digestive' },
  { code: 'K29', description: 'Gastritis and duodenitis', chapter: 'XI', category: 'Digestive' },
  { code: 'K30', description: 'Functional dyspepsia', chapter: 'XI', category: 'Digestive' },
  { code: 'K35', description: 'Acute appendicitis', chapter: 'XI', category: 'Digestive' },
  { code: 'K40', description: 'Inguinal hernia', chapter: 'XI', category: 'Digestive' },
  { code: 'K50', description: "Crohn's disease", chapter: 'XI', category: 'Digestive' },
  { code: 'K51', description: 'Ulcerative colitis', chapter: 'XI', category: 'Digestive' },
  { code: 'K52', description: 'Other noninfective gastroenteritis and colitis', chapter: 'XI', category: 'Digestive' },
  { code: 'K57', description: 'Diverticular disease of intestine', chapter: 'XI', category: 'Digestive' },
  { code: 'K58', description: 'Irritable bowel syndrome', chapter: 'XI', category: 'Digestive' },
  { code: 'K59', description: 'Other functional intestinal disorders', chapter: 'XI', category: 'Digestive' },
  { code: 'K63', description: 'Other diseases of intestine', chapter: 'XI', category: 'Digestive' },
  { code: 'K70', description: 'Alcoholic liver disease', chapter: 'XI', category: 'Digestive' },
  { code: 'K74', description: 'Fibrosis and cirrhosis of liver', chapter: 'XI', category: 'Digestive' },
  { code: 'K76', description: 'Other diseases of liver', chapter: 'XI', category: 'Digestive' },
  { code: 'K80', description: 'Cholelithiasis', chapter: 'XI', category: 'Digestive' },
  { code: 'K81', description: 'Cholecystitis', chapter: 'XI', category: 'Digestive' },
  { code: 'K85', description: 'Acute pancreatitis', chapter: 'XI', category: 'Digestive' },
  { code: 'K86', description: 'Other diseases of pancreas', chapter: 'XI', category: 'Digestive' },

  // Chapter XII: Skin (L00-L99)
  { code: 'L01', description: 'Impetigo', chapter: 'XII', category: 'Skin' },
  { code: 'L02', description: 'Cutaneous abscess, furuncle and carbuncle', chapter: 'XII', category: 'Skin' },
  { code: 'L03', description: 'Cellulitis and acute lymphangitis', chapter: 'XII', category: 'Skin' },
  { code: 'L04', description: 'Acute lymphadenitis', chapter: 'XII', category: 'Skin' },
  { code: 'L08', description: 'Other local infections of skin and subcutaneous tissue', chapter: 'XII', category: 'Skin' },
  { code: 'L20', description: 'Atopic dermatitis', chapter: 'XII', category: 'Skin' },
  { code: 'L21', description: 'Seborrheic dermatitis', chapter: 'XII', category: 'Skin' },
  { code: 'L23', description: 'Allergic contact dermatitis', chapter: 'XII', category: 'Skin' },
  { code: 'L28', description: 'Lichen simplex chronicus and prurigo', chapter: 'XII', category: 'Skin' },
  { code: 'L29', description: 'Pruritus', chapter: 'XII', category: 'Skin' },
  { code: 'L30', description: 'Other and unspecified eczema', chapter: 'XII', category: 'Skin' },
  { code: 'L40', description: 'Psoriasis', chapter: 'XII', category: 'Skin' },
  { code: 'L50', description: 'Urticaria', chapter: 'XII', category: 'Skin' },
  { code: 'L51', description: 'Erythema multiforme', chapter: 'XII', category: 'Skin' },
  { code: 'L60', description: 'Nail disorders', chapter: 'XII', category: 'Skin' },
  { code: 'L63', description: 'Alopecia areata', chapter: 'XII', category: 'Skin' },
  { code: 'L64', description: 'Androgenic alopecia', chapter: 'XII', category: 'Skin' },
  { code: 'L70', description: 'Acne', chapter: 'XII', category: 'Skin' },
  { code: 'L72', description: 'Follicular cysts of skin and subcutaneous tissue', chapter: 'XII', category: 'Skin' },
  { code: 'L80', description: 'Vitiligo', chapter: 'XII', category: 'Skin' },
  { code: 'L81', description: 'Other disorders of pigmentation', chapter: 'XII', category: 'Skin' },
  { code: 'L82', description: 'Seborrheic keratosis', chapter: 'XII', category: 'Skin' },
  { code: 'L84', description: 'Corns and callosities', chapter: 'XII', category: 'Skin' },
  { code: 'L85', description: 'Other epidermal thickening', chapter: 'XII', category: 'Skin' },
  { code: 'L90', description: 'Atrophic disorders of skin', chapter: 'XII', category: 'Skin' },
  { code: 'L91', description: 'Hypertrophic disorders of skin', chapter: 'XII', category: 'Skin' },

  // Chapter XIII: Musculoskeletal (M00-M99)
  { code: 'M10', description: 'Gout', chapter: 'XIII', category: 'Musculoskeletal' },
  { code: 'M13', description: 'Other arthritis', chapter: 'XIII', category: 'Musculoskeletal' },
  { code: 'M15', description: 'Polyosteoarthritis', chapter: 'XIII', category: 'Musculoskeletal' },
  { code: 'M16', description: 'Osteoarthritis of hip', chapter: 'XIII', category: 'Musculoskeletal' },
  { code: 'M17', description: 'Osteoarthritis of knee', chapter: 'XIII', category: 'Musculoskeletal' },
  { code: 'M19', description: 'Other and unspecified osteoarthritis', chapter: 'XIII', category: 'Musculoskeletal' },
  { code: 'M25', description: 'Other joint disorder, not elsewhere classified', chapter: 'XIII', category: 'Musculoskeletal' },
  { code: 'M40', description: 'Kyphosis and lordosis', chapter: 'XIII', category: 'Musculoskeletal' },
  { code: 'M41', description: 'Scoliosis', chapter: 'XIII', category: 'Musculoskeletal' },
  { code: 'M43', description: 'Other deforming dorsopathies', chapter: 'XIII', category: 'Musculoskeletal' },
  { code: 'M47', description: 'Spondylosis', chapter: 'XIII', category: 'Musculoskeletal' },
  { code: 'M50', description: 'Cervical disc disorders', chapter: 'XIII', category: 'Musculoskeletal' },
  { code: 'M51', description: 'Thoracic, thoracolumbar, and lumbosacral disc disorders', chapter: 'XIII', category: 'Musculoskeletal' },
  { code: 'M53', description: 'Other and unspecified dorsopathies, not elsewhere classified', chapter: 'XIII', category: 'Musculoskeletal' },
  { code: 'M54', description: 'Dorsalgia', chapter: 'XIII', category: 'Musculoskeletal' },
  { code: 'M60', description: 'Myositis', chapter: 'XIII', category: 'Musculoskeletal' },
  { code: 'M62', description: 'Other disorders of muscle', chapter: 'XIII', category: 'Musculoskeletal' },
  { code: 'M63', description: 'Disorders of muscle, not elsewhere classified', chapter: 'XIII', category: 'Musculoskeletal' },
  { code: 'M65', description: 'Synovitis and tenosynovitis', chapter: 'XIII', category: 'Musculoskeletal' },
  { code: 'M67', description: 'Other disorders of synovium and tendon', chapter: 'XIII', category: 'Musculoskeletal' },
  { code: 'M70', description: 'Soft tissue disorders related to use, overuse and pressure', chapter: 'XIII', category: 'Musculoskeletal' },
  { code: 'M72', description: 'Fibroblastic disorders', chapter: 'XIII', category: 'Musculoskeletal' },
  { code: 'M75', description: 'Shoulder lesions', chapter: 'XIII', category: 'Musculoskeletal' },
  { code: 'M76', description: 'Enthesopathies, lower limb, excluding foot', chapter: 'XIII', category: 'Musculoskeletal' },
  { code: 'M77', description: 'Other enthesopathies', chapter: 'XIII', category: 'Musculoskeletal' },
  { code: 'M79', description: 'Other and unspecified soft tissue disorders', chapter: 'XIII', category: 'Musculoskeletal' },
  { code: 'M80', description: 'Osteoporosis with current pathological fracture', chapter: 'XIII', category: 'Musculoskeletal' },
  { code: 'M81', description: 'Osteoporosis without current pathological fracture', chapter: 'XIII', category: 'Musculoskeletal' },
  { code: 'M84', description: 'Disorder of continuity of bone', chapter: 'XIII', category: 'Musculoskeletal' },
  { code: 'M85', description: 'Other disorders of bone structure and mineralization', chapter: 'XIII', category: 'Musculoskeletal' },
  { code: 'M87', description: 'Osteonecrosis', chapter: 'XIII', category: 'Musculoskeletal' },
  { code: 'M89', description: 'Other disorders of bone', chapter: 'XIII', category: 'Musculoskeletal' },
  { code: 'M91', description: 'Juvenile osteochondrosis of hip and pelvis', chapter: 'XIII', category: 'Musculoskeletal' },
  { code: 'M92', description: 'Other juvenile osteochondrosis', chapter: 'XIII', category: 'Musculoskeletal' },
  { code: 'M93', description: 'Other osteochondropathy', chapter: 'XIII', category: 'Musculoskeletal' },
  { code: 'M94', description: 'Other disorders of cartilage', chapter: 'XIII', category: 'Musculoskeletal' },
  { code: 'M95', description: 'Other acquired deformity of musculoskeletal system', chapter: 'XIII', category: 'Musculoskeletal' },
  { code: 'M96', description: 'Postprocedural musculoskeletal disorders, not elsewhere classified', chapter: 'XIII', category: 'Musculoskeletal' },

  // Chapter XIV: Genitourinary (N00-N99)
  { code: 'N18', description: 'Chronic kidney disease', chapter: 'XIV', category: 'Genitourinary' },
  { code: 'N20', description: 'Calculus of kidney and ureter', chapter: 'XIV', category: 'Genitourinary' },
  { code: 'N30', description: 'Cystitis', chapter: 'XIV', category: 'Genitourinary' },
  { code: 'N39', description: 'Other disorders of urinary system', chapter: 'XIV', category: 'Genitourinary' },
  { code: 'N40', description: 'Benign prostatic hyperplasia', chapter: 'XIV', category: 'Genitourinary' },
  { code: 'N63', description: 'Unspecified lump in breast', chapter: 'XIV', category: 'Genitourinary' },
  { code: 'N76', description: 'Other inflammation of vagina and vulva', chapter: 'XIV', category: 'Genitourinary' },
  { code: 'N80', description: 'Endometriosis', chapter: 'XIV', category: 'Genitourinary' },
  { code: 'N81', description: 'Female genital prolapse', chapter: 'XIV', category: 'Genitourinary' },
  { code: 'N92', description: 'Excessive, frequent and irregular menstruation', chapter: 'XIV', category: 'Genitourinary' },
  { code: 'N94', description: 'Pain and other conditions associated with female genital organs', chapter: 'XIV', category: 'Genitourinary' },

  // Chapter XV: Pregnancy (O00-O99)
  { code: 'O10', description: 'Pre-existing hypertension complicating pregnancy', chapter: 'XV', category: 'Pregnancy' },
  { code: 'O26', description: 'Maternal care for other conditions predominantly related to pregnancy', chapter: 'XV', category: 'Pregnancy' },

  // Chapter XVI: Perinatal (P00-P96)
  { code: 'P07', description: 'Disorders of newborn related to short gestation and low birth weight', chapter: 'XVI', category: 'Perinatal' },

  // Chapter XVII: Congenital (Q00-Q99)
  { code: 'Q21', description: 'Congenital malformations of cardiac septa', chapter: 'XVII', category: 'Congenital' },
  { code: 'Q66', description: 'Congenital deformities of feet', chapter: 'XVII', category: 'Congenital' },

  // Chapter XVIII: Symptoms (R00-R99)
  { code: 'R05', description: 'Cough', chapter: 'XVIII', category: 'Symptoms and signs' },
  { code: 'R06', description: 'Abnormalities of breathing', chapter: 'XVIII', category: 'Symptoms and signs' },
  { code: 'R07', description: 'Pain in throat and chest', chapter: 'XVIII', category: 'Symptoms and signs' },
  { code: 'R10', description: 'Abdominal and pelvic pain', chapter: 'XVIII', category: 'Symptoms and signs' },
  { code: 'R11', description: 'Nausea and vomiting', chapter: 'XVIII', category: 'Symptoms and signs' },
  { code: 'R13', description: 'Dysphagia', chapter: 'XVIII', category: 'Symptoms and signs' },
  { code: 'R14', description: 'Flatulence and related conditions', chapter: 'XVIII', category: 'Symptoms and signs' },
  { code: 'R15', description: 'Incontinence of feces', chapter: 'XVIII', category: 'Symptoms and signs' },
  { code: 'R17', description: 'Unspecified jaundice', chapter: 'XVIII', category: 'Symptoms and signs' },
  { code: 'R18', description: 'Ascites', chapter: 'XVIII', category: 'Symptoms and signs' },
  { code: 'R19', description: 'Other symptoms and signs involving the digestive system and abdomen', chapter: 'XVIII', category: 'Symptoms and signs' },
  { code: 'R21', description: 'Rash and other nonspecific skin eruption', chapter: 'XVIII', category: 'Symptoms and signs' },
  { code: 'R23', description: 'Other skin changes', chapter: 'XVIII', category: 'Symptoms and signs' },
  { code: 'R25', description: 'Abnormal involuntary movements', chapter: 'XVIII', category: 'Symptoms and signs' },
  { code: 'R26', description: 'Abnormalities of gait and mobility', chapter: 'XVIII', category: 'Symptoms and signs' },
  { code: 'R27', description: 'Other lack of coordination', chapter: 'XVIII', category: 'Symptoms and signs' },
  { code: 'R30', description: 'Pain associated with micturition', chapter: 'XVIII', category: 'Symptoms and signs' },
  { code: 'R31', description: 'Hematuria', chapter: 'XVIII', category: 'Symptoms and signs' },
  { code: 'R32', description: 'Unspecified urinary incontinence', chapter: 'XVIII', category: 'Symptoms and signs' },
  { code: 'R33', description: 'Retention of urine', chapter: 'XVIII', category: 'Symptoms and signs' },
  { code: 'R35', description: 'Polyuria', chapter: 'XVIII', category: 'Symptoms and signs' },
  { code: 'R39', description: 'Other and unspecified symptoms and signs involving the genitourinary system', chapter: 'XVIII', category: 'Symptoms and signs' },
  { code: 'R40', description: 'Somnolence, stupor and coma', chapter: 'XVIII', category: 'Symptoms and signs' },
  { code: 'R41', description: 'Other symptoms and signs involving cognitive functions and awareness', chapter: 'XVIII', category: 'Symptoms and signs' },
  { code: 'R42', description: 'Dizziness and giddiness', chapter: 'XVIII', category: 'Symptoms and signs' },
  { code: 'R43', description: 'Disturbances of smell and taste', chapter: 'XVIII', category: 'Symptoms and signs' },
  { code: 'R44', description: 'Other symptoms and signs involving general sensations and perceptions', chapter: 'XVIII', category: 'Symptoms and signs' },
  { code: 'R45', description: 'Symptoms and signs involving emotional state', chapter: 'XVIII', category: 'Symptoms and signs' },
  { code: 'R46', description: 'Symptoms and signs involving appearance and behavior', chapter: 'XVIII', category: 'Symptoms and signs' },
  { code: 'R50', description: 'Fever and other physiologic temperature elevation', chapter: 'XVIII', category: 'Symptoms and signs' },
  { code: 'R51', description: 'Headache', chapter: 'XVIII', category: 'Symptoms and signs' },
  { code: 'R52', description: 'Pain, unspecified', chapter: 'XVIII', category: 'Symptoms and signs' },
  { code: 'R53', description: 'Malaise and fatigue', chapter: 'XVIII', category: 'Symptoms and signs' },
  { code: 'R55', description: 'Syncope and collapse', chapter: 'XVIII', category: 'Symptoms and signs' },
  { code: 'R56', description: 'Convulsions, not elsewhere classified', chapter: 'XVIII', category: 'Symptoms and signs' },
  { code: 'R57', description: 'Shock, not elsewhere classified', chapter: 'XVIII', category: 'Symptoms and signs' },
  { code: 'R58', description: 'Hemorrhage, not elsewhere classified', chapter: 'XVIII', category: 'Symptoms and signs' },
  { code: 'R59', description: 'Enlarged lymph nodes', chapter: 'XVIII', category: 'Symptoms and signs' },
  { code: 'R60', description: 'Edema, not elsewhere classified', chapter: 'XVIII', category: 'Symptoms and signs' },
  { code: 'R61', description: 'Generalized hyperhidrosis', chapter: 'XVIII', category: 'Symptoms and signs' },
  { code: 'R63', description: 'Symptoms and signs concerning food and fluid intake', chapter: 'XVIII', category: 'Symptoms and signs' },
  { code: 'R64', description: 'Cachexia', chapter: 'XVIII', category: 'Symptoms and signs' },
  { code: 'R68', description: 'Other general symptoms and signs', chapter: 'XVIII', category: 'Symptoms and signs' },
  { code: 'R69', description: 'Illness, unspecified', chapter: 'XVIII', category: 'Symptoms and signs' },
  { code: 'R70', description: 'Elevated erythrocyte sedimentation rate and other abnormal blood findings', chapter: 'XVIII', category: 'Symptoms and signs' },
  { code: 'R71', description: 'Abnormality of red blood cells', chapter: 'XVIII', category: 'Symptoms and signs' },
  { code: 'R73', description: 'Elevated blood glucose level', chapter: 'XVIII', category: 'Symptoms and signs' },
  { code: 'R74', description: 'Abnormal serum enzyme levels', chapter: 'XVIII', category: 'Symptoms and signs' },
  { code: 'R76', description: 'Other abnormal findings on serological and microbiological examination', chapter: 'XVIII', category: 'Symptoms and signs' },
  { code: 'R77', description: 'Other abnormalities of plasma proteins', chapter: 'XVIII', category: 'Symptoms and signs' },
  { code: 'R78', description: 'Findings of drugs and other substances, not normally found in blood', chapter: 'XVIII', category: 'Symptoms and signs' },
  { code: 'R79', description: 'Other abnormal findings of blood chemistry', chapter: 'XVIII', category: 'Symptoms and signs' },
  { code: 'R80', description: '孤立性血尿 (Isolated hematuria)', chapter: 'XVIII', category: 'Symptoms and signs' },
  { code: 'R81', description: 'Glycosuria', chapter: 'XVIII', category: 'Symptoms and signs' },
  { code: 'R82', description: 'Other abnormal urinary findings', chapter: 'XVIII', category: 'Symptoms and signs' },
  { code: 'R83', description: 'Abnormal findings on cerebrospinal fluid examination', chapter: 'XVIII', category: 'Symptoms and signs' },
  { code: 'R84', description: 'Abnormal findings on examination of specimens from respiratory organs and thorax', chapter: 'XVIII', category: 'Symptoms and signs' },
  { code: 'R85', description: 'Abnormal findings on examination specimens from digestive organs and abdominal cavity', chapter: 'XVIII', category: 'Symptoms and signs' },
  { code: 'R86', description: 'Abnormal findings on examination of specimens from male genital organs', chapter: 'XVIII', category: 'Symptoms and signs' },
  { code: 'R87', description: 'Abnormal findings on examination of specimens from female genital organs', chapter: 'XVIII', category: 'Symptoms and signs' },
  { code: 'R88', description: 'Abnormal findings on other specimens', chapter: 'XVIII', category: 'Symptoms and signs' },
  { code: 'R89', description: 'Abnormal findings on examination of specimens from other organs, systems and tissues', chapter: 'XVIII', category: 'Symptoms and signs' },
  { code: 'R90', description: 'Abnormal findings on diagnostic imaging of central nervous system', chapter: 'XVIII', category: 'Symptoms and signs' },
  { code: 'R91', description: 'Abnormal findings on diagnostic imaging of lung', chapter: 'XVIII', category: 'Symptoms and signs' },
  { code: 'R92', description: 'Abnormal findings on diagnostic imaging of breast', chapter: 'XVIII', category: 'Symptoms and signs' },
  { code: 'R93', description: 'Abnormal findings on diagnostic imaging of other body structures', chapter: 'XVIII', category: 'Symptoms and signs' },
  { code: 'R94', description: 'Abnormal results of function studies', chapter: 'XVIII', category: 'Symptoms and signs' },
  { code: 'R95', description: 'Infant death syndrome', chapter: 'XVIII', category: 'Symptoms and signs' },
  { code: 'R96', description: 'Other sudden death, cause unknown', chapter: 'XVIII', category: 'Symptoms and signs' },
  { code: 'R97', description: 'Postprocedural disorder', chapter: 'XVIII', category: 'Symptoms and signs' },
  { code: 'R98', description: 'Unattended death', chapter: 'XVIII', category: 'Symptoms and signs' },
  { code: 'R99', description: 'Other ill-defined and unknown causes of mortality', chapter: 'XVIII', category: 'Symptoms and signs' },

  // Chapter XIX: Injuries (S00-T98)
  { code: 'S00', description: 'Superficial injury of head', chapter: 'XIX', category: 'Injuries' },
  { code: 'S09', description: 'Other and unspecified injuries of head', chapter: 'XIX', category: 'Injuries' },
  { code: 'S22', description: 'Fracture of rib(s), sternum and thoracic spine', chapter: 'XIX', category: 'Injuries' },
  { code: 'S32', description: 'Fracture of lumbar spine and pelvis', chapter: 'XIX', category: 'Injuries' },
  { code: 'S42', description: 'Fracture of shoulder and upper arm', chapter: 'XIX', category: 'Injuries' },
  { code: 'S52', description: 'Fracture of forearm', chapter: 'XIX', category: 'Injuries' },
  { code: 'S62', description: 'Fracture at wrist and hand level', chapter: 'XIX', category: 'Injuries' },
  { code: 'S72', description: 'Fracture of femur', chapter: 'XIX', category: 'Injuries' },
  { code: 'S82', description: 'Fracture of lower leg, including ankle', chapter: 'XIX', category: 'Injuries' },
  { code: 'S93', description: 'Dislocation and sprain of joints and ligaments at ankle, foot and toe', chapter: 'XIX', category: 'Injuries' },
  { code: 'S96', description: 'Injury of muscle and tendon at ankle and foot level', chapter: 'XIX', category: 'Injuries' },

  // Chapter XXI: Health status (Z00-Z99)
  { code: 'Z00', description: 'Encounter for general examination without complaint, suspected or reported diagnosis', chapter: 'XXI', category: 'Health status' },
  { code: 'Z01', description: 'Encounter for other special examination without complaint, suspected or reported diagnosis', chapter: 'XXI', category: 'Health status' },
  { code: 'Z12', description: 'Encounter for screening for neoplasms', chapter: 'XXI', category: 'Health status' },
  { code: 'Z23', description: 'Encounter for immunization', chapter: 'XXI', category: 'Health status' },
  { code: 'Z71', description: 'Persons encountering health services for other counseling and medical advice', chapter: 'XXI', category: 'Health status' },
  { code: 'Z76', description: 'Persons encountering health services in other circumstances', chapter: 'XXI', category: 'Health status' },
];

// ─── LOINC Common Lab Tests ────────────────────────────────────────────────────
const loincSeed = [
  // Complete Blood Count (CBC)
  { loincNum: '6690-2', component: 'White blood cells (WBC)', system: 'BLOOD', units: '10*3/uL', scale: 'Qn' },
  { loincNum: '789-8', component: 'Erythrocytes (RBC)', system: 'BLOOD', units: '10*6/uL', scale: 'Qn' },
  { loincNum: '718-7', component: 'Hemoglobin', system: 'BLOOD', units: 'g/dL', scale: 'Qn' },
  { loincNum: '4544-3', component: 'Hematocrit', system: 'BLOOD', units: '%', scale: 'Qn' },
  { loincNum: '787-2', component: 'Mean corpuscular volume (MCV)', system: 'BLOOD', units: 'fL', scale: 'Qn' },
  { loincNum: '785-6', component: 'Mean corpuscular hemoglobin (MCH)', system: 'BLOOD', units: 'pg', scale: 'Qn' },
  { loincNum: '786-4', component: 'Mean corpuscular hemoglobin concentration (MCHC)', system: 'BLOOD', units: 'g/dL', scale: 'Qn' },
  { loincNum: '788-0', component: 'Red cell distribution width (RDW)', system: 'BLOOD', units: '%', scale: 'Qn' },
  { loincNum: '777-3', component: 'Platelet count', system: 'BLOOD', units: '10*3/uL', scale: 'Qn' },
  { loincNum: '32623-1', component: 'Mean platelet volume (MPV)', system: 'BLOOD', units: 'fL', scale: 'Qn' },

  // Differential Count
  { loincNum: '704-7', component: 'Neutrophils', system: 'BLOOD', units: '%', scale: 'Qn' },
  { loincNum: '706-2', component: 'Bands Neutrophils', system: 'BLOOD', units: '%', scale: 'Qn' },
  { loincNum: '713-8', component: 'Lymphocytes', system: 'BLOOD', units: '%', scale: 'Qn' },
  { loincNum: '7139-5', component: 'Relative lymphocytes count', system: 'BLOOD', units: '%', scale: 'Qn' },
  { loincNum: '711-2', component: 'Monocytes', system: 'BLOOD', units: '%', scale: 'Qn' },
  { loincNum: '713-7', component: 'Eosinophils', system: 'BLOOD', units: '%', scale: 'Qn' },
  { loincNum: '704-8', component: 'Basophils', system: 'BLOOD', units: '%', scale: 'Qn' },

  // Metabolic Panel
  { loincNum: '2951-2', component: 'Sodium', system: 'Serum/Plasma', units: 'mmol/L', scale: 'Qn' },
  { loincNum: '2823-3', component: 'Potassium', system: 'Serum/Plasma', units: 'mmol/L', scale: 'Qn' },
  { loincNum: '2075-0', component: 'Chloride', system: 'Serum/Plasma', units: 'mmol/L', scale: 'Qn' },
  { loincNum: '1963-8', component: 'Bicarbonate', system: 'Serum/Plasma', units: 'mmol/L', scale: 'Qn' },
  { loincNum: '3094-0', component: 'Blood urea nitrogen (BUN)', system: 'Serum/Plasma', units: 'mg/dL', scale: 'Qn' },
  { loincNum: '2160-0', component: 'Creatinine', system: 'Serum/Plasma', units: 'mg/dL', scale: 'Qn' },
  { loincNum: '2345-7', component: 'Glucose', system: 'Serum/Plasma', units: 'mg/dL', scale: 'Qn' },
  { loincNum: '6298-4', component: 'Blood glucose fasting', system: 'BLOOD', units: 'mg/dL', scale: 'Qn' },
  { loincNum: '4548-4', component: 'Hemoglobin A1c (HbA1c)', system: 'BLOOD', units: '%', scale: 'Qn' },
  { loincNum: '10839-9', component: 'HbA1c/Hemoglobin.total', system: 'BLOOD', units: '%', scale: 'Qn' },
  { loincNum: '32344-4', component: 'Calculated plasma osmolality', system: 'Serum/Plasma', units: 'mOsm/kg', scale: 'Qn' },

  // Liver Function Tests
  { loincNum: '1975-2', component: 'Bilirubin.total', system: 'Serum/Plasma', units: 'mg/dL', scale: 'Qn' },
  { loincNum: '1974-5', component: 'Bilirubin.conjugated', system: 'Serum/Plasma', units: 'mg/dL', scale: 'Qn' },
  { loincNum: '1976-0', component: 'Alkaline phosphatase', system: 'Serum/Plasma', units: 'U/L', scale: 'Qn' },
  { loincNum: '1742-6', component: 'Alanine aminotransferase (ALT)', system: 'Serum/Plasma', units: 'U/L', scale: 'Qn' },
  { loincNum: '1920-8', component: 'Aspartate aminotransferase (AST)', system: 'Serum/Plasma', units: 'U/L', scale: 'Qn' },
  { loincNum: '2524-4', component: 'Gamma-glutamyl transferase (GGT)', system: 'Serum/Plasma', units: 'U/L', scale: 'Qn' },
  { loincNum: '2756-2', component: 'Lactate dehydrogenase (LDH)', system: 'Serum/Plasma', units: 'U/L', scale: 'Qn' },
  { loincNum: '24204-5', component: 'Protein.total', system: 'Serum/Plasma', units: 'g/dL', scale: 'Qn' },
  { loincNum: '10839-9', component: 'Albumin', system: 'Serum/Plasma', units: 'g/dL', scale: 'Qn' },

  // Lipid Profile
  { loincNum: '2093-3', component: 'Cholesterol.total', system: 'Serum/Plasma', units: 'mg/dL', scale: 'Qn' },
  { loincNum: '2085-9', component: 'Cholesterol in HDL', system: 'Serum/Plasma', units: 'mg/dL', scale: 'Qn' },
  { loincNum: '2089-1', component: 'Cholesterol in LDL', system: 'Serum/Plasma', units: 'mg/dL', scale: 'Qn' },
  { loincNum: '2571-5', component: 'Triglycerides', system: 'Serum/Plasma', units: 'mg/dL', scale: 'Qn' },
  { loincNum: '9830-1', component: 'Cholesterol/HDL ratio', system: 'Serum/Plasma', units: 'ratio', scale: 'Qn' },
  { loincNum: '13457-7', component: 'LDL/HDL ratio', system: 'Serum/Plasma', units: 'ratio', scale: 'Qn' },
  { loincNum: '18263-0', component: 'Non-HDL cholesterol', system: 'Serum/Plasma', units: 'mg/dL', scale: 'Qn' },

  // Thyroid
  { loincNum: '3026-2', component: 'Thyroid stimulating hormone (TSH)', system: 'Serum/Plasma', units: 'mIU/L', scale: 'Qn' },
  { loincNum: '3024-7', component: 'Thyroxine (T4) free', system: 'Serum/Plasma', units: 'ng/dL', scale: 'Qn' },
  { loincNum: '3053-6', component: 'Triiodothyronine (T3)', system: 'Serum/Plasma', units: 'ng/dL', scale: 'Qn' },
  { loincNum: '3054-4', component: 'T3 Free', system: 'Serum/Plasma', units: 'pg/mL', scale: 'Qn' },

  // Urinalysis
  { loincNum: '5778-6', component: 'Urine color', system: 'URINE', units: '', scale: 'Nom' },
  { loincNum: '5767-9', component: 'Urine appearance', system: 'URINE', units: '', scale: 'Nom' },
  { loincNum: '2756-5', component: 'Urine specific gravity', system: 'URINE', units: 'ratio', scale: 'Qn' },
  { loincNum: '5811-5', component: 'Urine pH', system: 'URINE', units: '', scale: 'Qn' },
  { loincNum: '5814-9', component: 'Urine protein', system: 'URINE', units: '', scale: 'Nom' },
  { loincNum: '5804-0', component: 'Urine glucose', system: 'URINE', units: '', scale: 'Nom' },
  { loincNum: '5792-7', component: 'Urine ketones', system: 'URINE', units: '', scale: 'Nom' },
  { loincNum: '5802-4', component: 'Urine blood', system: 'URINE', units: '', scale: 'Nom' },
  { loincNum: '5803-2', component: 'Urine leukocyte esterase', system: 'URINE', units: '', scale: 'Nom' },
  { loincNum: '5806-5', component: 'Urine nitrite', system: 'URINE', units: '', scale: 'Nom' },
  { loincNum: '2756-6', component: 'Urine bilirubin', system: 'URINE', units: '', scale: 'Nom' },
  { loincNum: '5808-1', component: 'Urine urobilinogen', system: 'URINE', units: 'mg/dL', scale: 'Qn' },
  { loincNum: '5801-6', component: 'Urine epithelial cells', system: 'URINE', units: '/hpf', scale: 'Qn' },
  { loincNum: '5821-4', component: 'Urine RBC', system: 'URINE', units: '/hpf', scale: 'Qn' },
  { loincNum: '5842-0', component: 'Urine WBC', system: 'URINE', units: '/hpf', scale: 'Qn' },
  { loincNum: '5822-2', component: 'Urine bacteria', system: 'URINE', units: '', scale: 'Nom' },

  // Coagulation
  { loincNum: '5902-2', component: 'Prothrombin time (PT)', system: 'Plasma', units: 's', scale: 'Qn' },
  { loincNum: '6301-6', component: 'INR', system: 'Plasma', units: 'ratio', scale: 'Qn' },
  { loincNum: '3173-2', component: 'Activated partial thromboplastin time (APTT)', system: 'Plasma', units: 's', scale: 'Qn' },
  { loincNum: '48348-9', component: 'D-dimer', system: 'Plasma', units: 'ng/mL', scale: 'Qn' },

  // Cardiac
  { loincNum: '30522-7', component: 'Troponin I', system: 'Serum/Plasma', units: 'ng/mL', scale: 'Qn' },
  { loincNum: '6598-7', component: 'Troponin T', system: 'Serum/Plasma', units: 'ng/mL', scale: 'Qn' },
  { loincNum: '10839-9', component: 'CK-MB', system: 'Serum/Plasma', units: 'U/L', scale: 'Qn' },
  { loincNum: '20570-8', component: 'BNP (Brain Natriuretic Peptide)', system: 'Serum/Plasma', units: 'pg/mL', scale: 'Qn' },
  { loincNum: '33762-6', component: 'NT-proBNP', system: 'Serum/Plasma', units: 'pg/mL', scale: 'Qn' },
  { loincNum: '20303-4', component: 'C-reactive protein (CRP)', system: 'Serum/Plasma', units: 'mg/L', scale: 'Qn' },
  { loincNum: '30522-7', component: 'High-sensitivity CRP (hs-CRP)', system: 'Serum/Plasma', units: 'mg/L', scale: 'Qn' },

  // Inflammatory / Immunological
  { loincNum: '4537-7', component: 'Erythrocyte sedimentation rate (ESR)', system: 'BLOOD', units: 'mm/h', scale: 'Qn' },
  { loincNum: '40968-7', component: 'Anti-streptolysin O (ASO) titer', system: 'Serum/Plasma', units: 'IU/mL', scale: 'Qn' },
  { loincNum: '43815-8', component: 'Rheumatoid factor (RF)', system: 'Serum/Plasma', units: 'IU/mL', scale: 'Qn' },
  { loincNum: '42227-4', component: 'Anti-nuclear antibody (ANA)', system: 'Serum/Plasma', units: '', scale: 'Nom' },
  { loincNum: '20480-1', component: 'C3 Complement', system: 'Serum/Plasma', units: 'mg/dL', scale: 'Qn' },
  { loincNum: '20481-9', component: 'C4 Complement', system: 'Serum/Plasma', units: 'mg/dL', scale: 'Qn' },
  { loincNum: '33762-6', component: 'Ant-CCP (Cyclic Citrullinated Peptide)', system: 'Serum/Plasma', units: 'U/mL', scale: 'Qn' },

  // Iron Studies
  { loincNum: '2502-8', component: 'Iron, serum', system: 'Serum/Plasma', units: 'mcg/dL', scale: 'Qn' },
  { loincNum: '2500-2', component: 'Ferritin', system: 'Serum/Plasma', units: 'ng/mL', scale: 'Qn' },
  { loincNum: '2501-0', component: 'Iron binding capacity (TIBC)', system: 'Serum/Plasma', units: 'mcg/dL', scale: 'Qn' },
  { loincNum: '2503-6', component: 'Transferrin saturation', system: 'Serum/Plasma', units: '%', scale: 'Qn' },

  // Vitamins
  { loincNum: '2132-9', component: 'Vitamin B12', system: 'Serum/Plasma', units: 'pg/mL', scale: 'Qn' },
  { loincNum: '2284-8', component: 'Folic acid (Folate)', system: 'Serum/Plasma', units: 'ng/mL', scale: 'Qn' },
  { loincNum: '1989-3', component: 'Vitamin D 25-OH', system: 'Serum/Plasma', units: 'ng/mL', scale: 'Qn' },
  { loincNum: '14635-7', component: 'Vitamin D 1,25-OH', system: 'Serum/Plasma', units: 'pg/mL', scale: 'Qn' },

  // Electrolytes
  { loincNum: '2947-0', component: 'Calcium', system: 'Serum/Plasma', units: 'mg/dL', scale: 'Qn' },
  { loincNum: '17861-6', component: 'Calcium.ionized', system: 'Serum/Plasma', units: 'mg/dL', scale: 'Qn' },
  { loincNum: '6299-2', component: 'Phosphate', system: 'Serum/Plasma', units: 'mg/dL', scale: 'Qn' },
  { loincNum: '2857-1', component: 'Magnesium', system: 'Serum/Plasma', units: 'mg/dL', scale: 'Qn' },
  { loincNum: '30188-0', component: 'Uric acid', system: 'Serum/Plasma', units: 'mg/dL', scale: 'Qn' },
];

// ─── Procedure Codes (Indian Homeopathy Clinic context) ───────────────────────
const procedureSeed = [
  // Consultation
  { code: 'C001', name: 'New Case Consultation', category: 'Consultation', description: 'Initial consultation with detailed case taking' },
  { code: 'C002', name: 'Follow-up Consultation', category: 'Consultation', description: 'Routine follow-up visit' },
  { code: 'C003', name: 'Emergency Consultation', category: 'Consultation', description: 'Urgent consultation outside schedule' },

  // Homeopathic Procedures
  { code: 'H001', name: 'Constitutional Remedy Administration', category: 'Homeopathy', description: 'Single constitutional remedy dose' },
  { code: 'H002', name: 'Acute Remedy Administration', category: 'Homeopathy', description: 'Remedy for acute condition' },
  { code: 'H003', name: 'LM Potency Succession', category: 'Homeopathy', description: 'LM potency preparation and administration' },
  { code: 'H004', name: 'Complimentary Remedy', category: 'Homeopathy', description: 'Intermediate or complimentary remedy' },
  { code: 'H005', name: 'Constitutional Medicine Kit', category: 'Homeopathy', description: 'Monthly constitutional kit preparation' },

  // Investigations
  { code: 'I001', name: 'Blood Glucose Check (Random)', category: 'Investigation', description: 'Random blood glucose estimation' },
  { code: 'I002', name: 'Blood Pressure Monitoring', category: 'Investigation', description: 'BP measurement and recording' },
  { code: 'I003', name: 'Urine Examination (Routine)', category: 'Investigation', description: 'Routine urinalysis' },
  { code: 'I004', name: 'CBC (Complete Blood Count)', category: 'Investigation', description: 'Complete blood count analysis' },

  // Administrative
  { code: 'A001', name: 'Case File Preparation', category: 'Administration', description: 'New case file documentation' },
  { code: 'A002', name: 'Medical Certificate Issuance', category: 'Administration', description: 'Medical certificate preparation' },
  { code: 'A003', name: 'Insurance Form Filling', category: 'Administration', description: 'Insurance related documentation' },
  { code: 'A004', name: 'Prescription Issuance', category: 'Administration', description: 'Detailed prescription preparation' },
];

// ─── Lab Panels ────────────────────────────────────────────────────────────────
const labPanelSeed = [
  { code: 'CBC', name: 'Complete Blood Count', description: 'Full blood count with differential' },
  { code: 'LFT', name: 'Liver Function Tests', description: 'Bilirubin, enzymes, protein panel' },
  { code: 'RFT', name: 'Renal Function Tests', description: 'BUN, Creatinine, electrolytes' },
  { code: 'LIPID', name: 'Lipid Profile', description: 'Cholesterol, HDL, LDL, Triglycerides' },
  { code: 'THYROID', name: 'Thyroid Profile', description: 'TSH, T3, T4' },
  { code: 'URINE', name: 'Complete Urinalysis', description: 'Physical, chemical and microscopic examination' },
  { code: 'CBCP', name: 'CBC + Peripheral Smear', description: 'Complete blood count with peripheral smear' },
  { code: 'MET', name: 'Metabolic Panel', description: 'Glucose, electrolytes, kidney and liver function' },
];

export async function seedClinicalCodes(db: DbClient) {
  console.log('[Seed] Seeding Clinical Terminology Codes...');

  // Seed ICD-10 codes
  console.log(`[Seed] Inserting ${icd10Seed.length} ICD-10 codes...`);
  for (const icd of icd10Seed) {
    try {
      await db.execute(sql`
        INSERT INTO icd_codes (code, version, description, chapter, category, is_active)
        VALUES (${icd.code}, 'ICD-10', ${icd.description}, ${icd.chapter}, ${icd.category}, true)
        ON CONFLICT DO NOTHING
      `);
    } catch (e) {
      console.error(`[Seed] Failed ICD ${icd.code}:`, (e as Error).message);
    }
  }

  // Seed LOINC codes
  console.log(`[Seed] Inserting ${loincSeed.length} LOINC codes...`);
  for (const loinc of loincSeed) {
    try {
      await db.execute(sql`
        INSERT INTO loinc_codes (loinc_num, component, system, units, scale, description)
        VALUES (${loinc.loincNum}, ${loinc.component}, ${loinc.system}, ${loinc.units}, ${loinc.scale}, ${loinc.component})
        ON CONFLICT (loinc_num) DO UPDATE SET
          component = EXCLUDED.component,
          system = EXCLUDED.system,
          units = EXCLUDED.units
      `);
    } catch (e) {
      console.error(`[Seed] Failed LOINC ${loinc.loincNum}:`, (e as Error).message);
    }
  }

  // Seed Procedure codes
  console.log(`[Seed] Inserting ${procedureSeed.length} Procedure codes...`);
  for (const proc of procedureSeed) {
    try {
      await db.execute(sql`
        INSERT INTO procedure_codes (code, name, description, category, standard, is_active)
        VALUES (${proc.code}, ${proc.name}, ${proc.description}, ${proc.category}, 'CPT', true)
        ON CONFLICT (code) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description
      `);
    } catch (e) {
      console.error(`[Seed] Failed proc ${proc.code}:`, (e as Error).message);
    }
  }

  // Seed Lab panels
  console.log(`[Seed] Inserting ${labPanelSeed.length} Lab panels...`);
  const panelIds: Record<string, number> = {};
  for (const panel of labPanelSeed) {
    try {
      await db.execute(sql`
        INSERT INTO lab_panels (code, name, description)
        VALUES (${panel.code}, ${panel.name}, ${panel.description})
        ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
      `);
      // Get panel ID for linking LOINC codes
      const result = await db.execute(sql`SELECT id FROM lab_panels WHERE code = ${panel.code}`);
      if (result && (result as any)[0]) {
        panelIds[panel.code] = (result as any)[0].id as number;
      }
    } catch (e) {
      console.error(`[Seed] Failed panel ${panel.code}:`, (e as Error).message);
    }
  }

  // Link CBC LOINCs to CBC panel
  const cbcLoincs = loincSeed.filter(l => ['6690-2', '789-8', '718-7', '4544-3', '787-2', '785-6', '786-4', '788-0', '777-3'].includes(l.loincNum));
  if (panelIds['CBC']) {
    for (const lc of cbcLoincs) {
      try {
        const loincResult = await db.execute(sql`SELECT id FROM loinc_codes WHERE loinc_num = ${lc.loincNum}`);
        if (loincResult && (loincResult as any)[0]) {
          await db.execute(sql`
            INSERT INTO lab_panel_loinc_links (lab_panel_id, loinc_code_id, sort_order)
            VALUES (${panelIds['CBC']}, ${(loincResult as any)[0].id}, 0)
            ON CONFLICT DO NOTHING
          `);
        }
      } catch (e) { /* ignore duplicates */ }
    }
  }

  console.log('[Seed] Clinical codes seeded successfully.');
}