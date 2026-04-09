CREATE TABLE "accounts" (
	"id" integer NOT NULL,
	"clinic_id" text,
	"name" text NOT NULL,
	"password" text,
	"designation" text NOT NULL,
	"gender" text NOT NULL,
	"mobile" text NOT NULL,
	"mobile2" text NOT NULL,
	"email" text NOT NULL,
	"dept" integer NOT NULL,
	"city" text NOT NULL,
	"address" text NOT NULL,
	"about" text NOT NULL,
	"date_birth" date NOT NULL,
	"date_left" date NOT NULL,
	"salary_cur" real NOT NULL,
	"deleted_at" timestamp,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "add_reminders" (
	"id" integer NOT NULL,
	"regid" integer NOT NULL,
	"remind_on" timestamp NOT NULL,
	"timepick" text,
	"heading" text,
	"comments" text,
	"deleted_at" timestamp NOT NULL,
	"updated_at" timestamp,
	"created_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "additional_charges" (
	"id" integer NOT NULL,
	"regid" integer,
	"rand_id" text,
	"dateval" text,
	"additional_name" text,
	"additional_price" integer,
	"additional_quantity" integer,
	"received_price" integer,
	"created_at" timestamp,
	"updated_at" timestamp,
	"deleted_at" text
);
--> statement-breakpoint
CREATE TABLE "ai_audit_logs" (
	"id" integer NOT NULL,
	"tenant_id" integer,
	"visit_id" integer,
	"action_type" text,
	"input_hash" text,
	"output_json" jsonb,
	"user_id" integer,
	"action" text,
	"prompt_name" text,
	"model_provider" text,
	"model_name" text,
	"input_tokens" integer,
	"output_tokens" integer,
	"latency_ms" integer,
	"input_data" jsonb,
	"output_data" jsonb,
	"confidence" real,
	"clinician_override" jsonb,
	"error_message" text,
	"created_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "ai_prompts" (
	"id" integer NOT NULL,
	"name" text,
	"specialty" text,
	"version" integer,
	"system_prompt" text,
	"user_prompt_template" text,
	"temperature" real,
	"max_tokens" integer,
	"is_active" boolean,
	"created_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "appointment_case" (
	"id" integer NOT NULL,
	"patient_id" text NOT NULL,
	"doctor_id" text NOT NULL,
	"appointment_id" integer NOT NULL,
	"created_at" timestamp,
	"updated_at" timestamp,
	"deleted_at" text
);
--> statement-breakpoint
CREATE TABLE "appointments" (
	"id" integer NOT NULL,
	"clinic_id" integer,
	"booking_date" text,
	"booking_time" text,
	"patient_id" integer,
	"assistant_doctor" text,
	"patient_name" text,
	"address" text,
	"state" text,
	"city" text,
	"phone" text,
	"status" text NOT NULL,
	"created_at" timestamp,
	"updated_at" timestamp,
	"deleted_at" text,
	"first_name" text,
	"last_name" text,
	"father_name" text,
	"age" integer,
	"pending_payment" text,
	"visit_type" text,
	"notes" text,
	"consultation_fee" text,
	"token_no" integer,
	"duration_minutes" integer,
	"cancellation_reason" text
);
--> statement-breakpoint
CREATE TABLE "ask_ques" (
	"id" integer NOT NULL,
	"regid" integer,
	"quesid" integer,
	"ansid" integer,
	"ans" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "backups" (
	"id" integer NOT NULL,
	"name" text NOT NULL,
	"file_name" text NOT NULL,
	"backup_size" text NOT NULL,
	"deleted_at" timestamp,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "bank_deposit" (
	"id" integer NOT NULL,
	"clinic_id" integer,
	"deposit_date" text NOT NULL,
	"dateval" text,
	"amount" text,
	"remark" text,
	"bankdeposit" text,
	"comments" text,
	"submitted" text,
	"created_at" timestamp,
	"updated_at" timestamp,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "basic_details" (
	"regid" integer NOT NULL,
	"id" integer NOT NULL,
	"current_date" timestamp NOT NULL,
	"title" text,
	"first_name" text,
	"middle_name" text,
	"surname" text,
	"gender" text,
	"religion" text,
	"status" text,
	"date_of_birth" timestamp NOT NULL,
	"occupation" text,
	"address" text,
	"courieroutstation" text,
	"road" text,
	"area" text,
	"city" text,
	"state" text,
	"pin" text,
	"phone_no" integer,
	"email_id" text,
	"mobile1" integer,
	"mobile2" integer,
	"reference" text,
	"refered_by" text,
	"send_sms" text,
	"select_scheme" text,
	"end_date" timestamp,
	"deleted_at" timestamp NOT NULL,
	"updated_at" timestamp,
	"created_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "bill" (
	"id" integer NOT NULL,
	"regid" integer,
	"rand_id" text,
	"Treatment" text,
	"Disease" text,
	"fromdate" text,
	"todate" text,
	"to_date" text,
	"Rupess" integer,
	"BillNo" integer,
	"DoctorID" integer,
	"RupeesInAmount" text,
	"Days" text,
	"BillDate" text,
	"payment_mode" text,
	"charges" integer,
	"received" integer,
	"Balance" integer,
	"charge_id" integer,
	"BalanceInAmount" text,
	"ReceivedInAmount" text,
	"call_status" text,
	"call_date" text,
	"created_at" timestamp,
	"updated_at" timestamp,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "books" (
	"id" integer NOT NULL,
	"title" text,
	"file" text,
	"created_at" timestamp,
	"updated_at" timestamp,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "case_arthritis" (
	"id" integer NOT NULL,
	"rand_id" integer,
	"regid" integer,
	"dateval" text,
	"anti_o" text,
	"accp" text,
	"ra_factor" text,
	"alkaline" text,
	"ana" text,
	"c_react" text,
	"c4" text,
	"created_at" timestamp,
	"updated_at" timestamp,
	"deleted_at" text
);
--> statement-breakpoint
CREATE TABLE "case_cardiac" (
	"id" integer NOT NULL,
	"rand_id" integer,
	"regid" integer,
	"dateval" text,
	"homocysteine" text,
	"ecg" text,
	"decho" text,
	"created_at" timestamp,
	"updated_at" timestamp,
	"deleted_at" text
);
--> statement-breakpoint
CREATE TABLE "case_cbc" (
	"id" integer NOT NULL,
	"rand_id" integer,
	"regid" integer,
	"dateval" text,
	"hb" text,
	"rbc" text,
	"wbc" text,
	"platelets" text,
	"vitaminb" text,
	"vitamind" text,
	"neutrophils" text,
	"lymphocytes" text,
	"eosinophils" text,
	"monocytes" text,
	"basophils" text,
	"band_cells" text,
	"abnor_rbc" text,
	"abnor_wbc" text,
	"parasites" text,
	"esr" text,
	"created_at" timestamp,
	"updated_at" timestamp,
	"deleted_at" text
);
--> statement-breakpoint
CREATE TABLE "case_datas" (
	"id" integer NOT NULL,
	"clinic_id" integer,
	"regid" integer,
	"patientid" integer,
	"assitant_doctor" text,
	"consultation_fee" integer,
	"dob" date,
	"title" text,
	"first_name" text,
	"middle_name" text,
	"surname" text,
	"gender" text,
	"status" text,
	"date_of_birth" text,
	"address" text,
	"road" text,
	"religion" text,
	"occupation" text,
	"alt_address" text,
	"phone" text,
	"area" text,
	"city" text,
	"mobile1" text,
	"state" text,
	"pin" text,
	"mobile2" text,
	"courier_outstation" text,
	"send_sms" text,
	"email" text,
	"scheme" text,
	"image" text,
	"deleted_at" timestamp,
	"updated_at" timestamp,
	"created_at" timestamp,
	"reference" text,
	"refered_name" text,
	"refered_by" text,
	"abha_id" text,
	"coupon" text NOT NULL,
	"refered_sms" text,
	"sdate" date,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "case_diabetes" (
	"id" integer NOT NULL,
	"rand_id" integer,
	"regid" integer,
	"dateval" text,
	"blood_fasting" text,
	"blood_prandial" text,
	"blood_random" text,
	"urine_fasting" text,
	"urine_prandial" text,
	"urine_random" text,
	"glu_test" text,
	"glycosylated_hb" text,
	"created_at" timestamp,
	"updated_at" timestamp,
	"deleted_at" text
);
--> statement-breakpoint
CREATE TABLE "case_endocrine" (
	"id" integer NOT NULL,
	"rand_id" integer,
	"regid" integer,
	"dateval" text,
	"t3" text,
	"t4" text,
	"tsh" text,
	"ft3" text,
	"ft4" text,
	"anti_tpo" text,
	"antibody" text,
	"prolactin" text,
	"fsh" text,
	"lsh" text,
	"progesterone_3" text,
	"progesterone" text,
	"dhea" text,
	"testosterone" text,
	"ama" text,
	"insulin" text,
	"glucose" text,
	"created_at" timestamp,
	"updated_at" timestamp,
	"deleted_at" text
);
--> statement-breakpoint
CREATE TABLE "case_examination" (
	"id" integer NOT NULL,
	"regid" integer NOT NULL,
	"rand_id" integer NOT NULL,
	"examination_date" text NOT NULL,
	"bp1" integer NOT NULL,
	"bp2" integer NOT NULL,
	"examination" text NOT NULL,
	"created_at" timestamp,
	"updated_at" timestamp,
	"deleted_at" text
);
--> statement-breakpoint
CREATE TABLE "case_frequency" (
	"id" integer NOT NULL,
	"title" text,
	"duration" text,
	"days" integer,
	"frequency" text,
	"created_at" timestamp,
	"updated_at" timestamp,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "case_heights" (
	"id" integer NOT NULL,
	"regid" integer NOT NULL,
	"rand_id" integer,
	"dob" date,
	"height" real,
	"weight" real,
	"blood_pressure" text,
	"blood_pressure2" text,
	"lmp" text,
	"deleted_at" timestamp,
	"updated_at" timestamp,
	"created_at" timestamp,
	"pulse" text,
	"temperature" text
);
--> statement-breakpoint
CREATE TABLE "case_images" (
	"id" integer NOT NULL,
	"regid" integer,
	"picture" text,
	"rand_id" text,
	"created_at" timestamp,
	"updated_at" timestamp,
	"image" text,
	"type" text,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "case_immunology" (
	"id" integer NOT NULL,
	"rand_id" integer,
	"regid" integer,
	"dateval" text,
	"igg" text,
	"ige" text,
	"igm" text,
	"iga" text,
	"itg" text,
	"created_at" timestamp,
	"updated_at" timestamp,
	"deleted_at" text
);
--> statement-breakpoint
CREATE TABLE "case_investigation" (
	"id" integer NOT NULL,
	"regid" integer NOT NULL,
	"rand_id" text,
	"invest_date" date,
	"hb" text,
	"t3" text,
	"t4" text,
	"tsh" text,
	"totalchol" text,
	"hdichol" text,
	"created_at" timestamp,
	"updated_at" timestamp,
	"deleted_at" text
);
--> statement-breakpoint
CREATE TABLE "case_lipid_profile" (
	"id" integer NOT NULL,
	"rand_id" integer,
	"regid" integer,
	"dateval" text,
	"total_cholesterol" text,
	"triglycerides" text,
	"hdl_cholesterol" text,
	"ldl_cholesterol" text,
	"vldl" text,
	"hdl_ratio" text,
	"ldl_hdl" text,
	"lipoprotein" text,
	"apolipoprotein_a" text,
	"apolipoprotein_b" text,
	"created_at" timestamp,
	"updated_at" timestamp,
	"deleted_at" text
);
--> statement-breakpoint
CREATE TABLE "case_liver_profile" (
	"id" integer NOT NULL,
	"rand_id" integer,
	"regid" integer,
	"dateval" text,
	"total_bil" text,
	"dir_bilirubin" text,
	"ind_bilirubin" text,
	"gamma_gt" text,
	"total_protein" text,
	"albumin" text,
	"globulin" text,
	"sgot" text,
	"sgpt" text,
	"alk_phos" text,
	"aust_antigen" text,
	"amylase" text,
	"created_at" timestamp,
	"updated_at" timestamp,
	"deleted_at" text
);
--> statement-breakpoint
CREATE TABLE "case_notes" (
	"id" integer NOT NULL,
	"regid" integer,
	"notes" text,
	"notes_type" text,
	"rand_id" text,
	"dateval" text,
	"created_at" timestamp,
	"updated_at" timestamp,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "case_potencies" (
	"id" integer NOT NULL,
	"regid" integer,
	"rand_id" text,
	"dateval" text,
	"todate" date,
	"sdate" date,
	"created_at" timestamp,
	"search_date" date,
	"rxdays" text,
	"rxfrequency" text,
	"rxremedy" text,
	"rxpotency" text,
	"rxprescription" text,
	"charges" text,
	"additional_name" text,
	"additional_price" integer,
	"received_price" integer,
	"received_date" text,
	"call_status" text,
	"call_date" text,
	"lastval" text,
	"deleted_at" text,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "case_potencies1" (
	"id" integer NOT NULL,
	"regid" integer,
	"rand_id" text,
	"dateval" text,
	"todate" text,
	"rxdays" integer,
	"rxfrequency" integer,
	"rxremedy" integer,
	"rxpotency" integer,
	"rxprescription" text,
	"charges" text,
	"additional_name" text,
	"additional_price" integer,
	"received_price" integer,
	"received_date" text,
	"call_status" text,
	"call_date" text,
	"deleted_at" text,
	"updated_at" timestamp,
	"created_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "case_reminder" (
	"id" integer NOT NULL,
	"clinic_id" integer,
	"patient_id" integer,
	"patient_name" text NOT NULL,
	"start_date" text NOT NULL,
	"end_date" text NOT NULL,
	"remind_time" text NOT NULL,
	"recursion" integer,
	"created_at" timestamp,
	"updated_at" timestamp,
	"deleted_at" text,
	"remind_after" text NOT NULL,
	"heading" text NOT NULL,
	"comments" text NOT NULL,
	"status" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "case_renal_profile" (
	"id" integer NOT NULL,
	"rand_id" integer,
	"regid" integer,
	"dateval" text,
	"bun" text,
	"urea" text,
	"creatinine" text,
	"uric_acid" text,
	"calcium" text,
	"phosphorus" text,
	"sodium" text,
	"potassium" text,
	"chloride" text,
	"created_at" timestamp,
	"updated_at" timestamp,
	"deleted_at" text
);
--> statement-breakpoint
CREATE TABLE "case_semenanalysis" (
	"id" integer NOT NULL,
	"rand_id" integer,
	"regid" integer,
	"dateval" text,
	"semen_analysis" text,
	"created_at" timestamp,
	"updated_at" timestamp,
	"deleted_at" text
);
--> statement-breakpoint
CREATE TABLE "case_serological_reports" (
	"id" integer NOT NULL,
	"rand_id" integer,
	"regid" integer,
	"dateval" text,
	"serological_report" text,
	"created_at" timestamp,
	"updated_at" timestamp,
	"deleted_at" text
);
--> statement-breakpoint
CREATE TABLE "case_specific" (
	"id" integer NOT NULL,
	"rand_id" integer,
	"regid" integer,
	"dateval" text,
	"other_findings" text,
	"define_field1" text,
	"define_field2" text,
	"define_field3" text,
	"define_field4" text,
	"created_at" timestamp,
	"updated_at" timestamp,
	"deleted_at" text
);
--> statement-breakpoint
CREATE TABLE "case_stool" (
	"id" integer NOT NULL,
	"rand_id" integer,
	"regid" integer,
	"dateval" text,
	"color" text,
	"consistency" text,
	"mucus" text,
	"frank_blood" text,
	"adult_worm" text,
	"reaction" text,
	"pus_cells" text,
	"occult_blood" text,
	"macrophages" text,
	"rbc" text,
	"ova" text,
	"cysts" text,
	"protozoa" text,
	"yeast_cell" text,
	"other_findings" text,
	"created_at" timestamp,
	"updated_at" timestamp,
	"deleted_at" text
);
--> statement-breakpoint
CREATE TABLE "case_urine" (
	"id" integer NOT NULL,
	"rand_id" integer,
	"regid" integer,
	"dateval" text,
	"quantity" text,
	"color" text,
	"appearance" text,
	"reaction" text,
	"gra" text,
	"protein" text,
	"sugar" text,
	"acetone" text,
	"pigments" text,
	"occult_blood" text,
	"urobilinogen" text,
	"epith_cells" text,
	"pus_cells" text,
	"rbc" text,
	"other_findings" text,
	"created_at" timestamp,
	"updated_at" timestamp,
	"deleted_at" text
);
--> statement-breakpoint
CREATE TABLE "case_usgfemale" (
	"id" integer NOT NULL,
	"rand_id" integer,
	"regid" integer,
	"dateval" text,
	"uterues_size" text,
	"thickness" text,
	"fibroids_no" text,
	"description" text,
	"ovary_size_rt" text,
	"ovary_size_lt" text,
	"ovary_volume_rt" text,
	"ovary_volume_lt" text,
	"follicles_rt" text,
	"follicles_lt" text,
	"created_at" timestamp,
	"updated_at" timestamp,
	"deleted_at" text
);
--> statement-breakpoint
CREATE TABLE "case_usgmale" (
	"id" integer NOT NULL,
	"rand_id" integer,
	"regid" integer,
	"dateval" text,
	"size" text,
	"volume" text,
	"serum_psa" text,
	"other_findings" text,
	"created_at" timestamp,
	"updated_at" timestamp,
	"deleted_at" text
);
--> statement-breakpoint
CREATE TABLE "case_vaccins" (
	"id" integer NOT NULL,
	"reg_id" integer,
	"vaccinee_id" integer,
	"created_at" timestamp,
	"updated_at" timestamp,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "case_xray" (
	"id" integer NOT NULL,
	"rand_id" integer,
	"regid" integer,
	"dateval" text,
	"radiological_report" text,
	"created_at" timestamp,
	"updated_at" timestamp,
	"deleted_at" text
);
--> statement-breakpoint
CREATE TABLE "cash_deposit" (
	"id" integer NOT NULL,
	"clinic_id" integer,
	"deposit_date" text NOT NULL,
	"dateval" text,
	"amount" text,
	"remark" text,
	"bankdeposit" text,
	"comments" text,
	"submitted" text,
	"created_at" timestamp,
	"updated_at" timestamp,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "charges" (
	"id" integer NOT NULL,
	"charges" text,
	"amount" integer,
	"quantity" integer,
	"type" text,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	"deleted_at" text
);
--> statement-breakpoint
CREATE TABLE "chats" (
	"id" integer NOT NULL,
	"userid" integer NOT NULL,
	"username" text NOT NULL,
	"message" text NOT NULL,
	"chat_date" text,
	"chat_time" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp,
	"deleted_at" text
);
--> statement-breakpoint
CREATE TABLE "clinicadmins" (
	"id" integer NOT NULL,
	"name" text NOT NULL,
	"password" text,
	"designation" text NOT NULL,
	"gender" text NOT NULL,
	"mobile" text NOT NULL,
	"mobile2" text NOT NULL,
	"email" text NOT NULL,
	"dept" integer NOT NULL,
	"city" text NOT NULL,
	"address" text NOT NULL,
	"about" text NOT NULL,
	"date_birth" date NOT NULL,
	"date_left" date NOT NULL,
	"salary_cur" real NOT NULL,
	"deleted_at" timestamp,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "communication_details" (
	"id" integer NOT NULL,
	"regid" integer NOT NULL,
	"rand_id" integer,
	"currentdate" text NOT NULL,
	"complaint_intesity" text,
	"complaint_intesity1" text,
	"complaint_intesity2" text,
	"deleted_at" timestamp,
	"updated_at" timestamp,
	"created_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "coupon" (
	"id" integer NOT NULL,
	"regid" integer,
	"coupon_title" text NOT NULL,
	"coupon_amount" text NOT NULL,
	"expire_date" text NOT NULL,
	"status" text,
	"created_at" timestamp,
	"updated_at" timestamp,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "courier_medicine" (
	"id" integer NOT NULL,
	"case_id" integer NOT NULL,
	"regid" integer,
	"rand_id" text NOT NULL,
	"currentdate" text NOT NULL,
	"remedy" text,
	"potency" text,
	"frequency" text,
	"days" text,
	"pcd" text,
	"courier" text,
	"pickup" integer NOT NULL,
	"post_type" text NOT NULL,
	"is_assign" integer NOT NULL,
	"read_type" text NOT NULL,
	"created_at" timestamp,
	"updated_at" timestamp,
	"deleted_at" text
);
--> statement-breakpoint
CREATE TABLE "courier_package_list" (
	"id" integer NOT NULL,
	"package_id" integer NOT NULL,
	"name" text NOT NULL,
	"quantity" integer NOT NULL,
	"price" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp,
	"deleted_at" text
);
--> statement-breakpoint
CREATE TABLE "couriermedicines" (
	"id" integer NOT NULL,
	"courier_id" integer NOT NULL,
	"regid" integer NOT NULL,
	"medicine_ids" jsonb,
	"dispatch_date" date,
	"tracking_no" text,
	"status" text,
	"notified" boolean,
	"created_at" timestamp,
	"updated_at" timestamp,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "couriers" (
	"id" integer NOT NULL,
	"package_id" integer NOT NULL,
	"total_no_package" integer NOT NULL,
	"created_at" timestamp,
	"updated_at" timestamp,
	"deleted_at" text
);
--> statement-breakpoint
CREATE TABLE "daily_target" (
	"id" integer NOT NULL,
	"cases" text NOT NULL,
	"collection" text NOT NULL,
	"dateval" text NOT NULL,
	"created_at" timestamp,
	"updated_at" timestamp,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "daycharges" (
	"id" integer NOT NULL,
	"days" text,
	"regular_charges" integer,
	"created_at" timestamp,
	"updated_at" timestamp,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "departments" (
	"id" integer NOT NULL,
	"name" text NOT NULL,
	"detail" text,
	"tags" text NOT NULL,
	"color" text NOT NULL,
	"deleted_at" timestamp,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "dictionary" (
	"id" integer NOT NULL,
	"title" text,
	"text" text,
	"comments" text,
	"cross_ref" text,
	"created_at" timestamp,
	"updated_at" timestamp,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "diseases" (
	"id" integer NOT NULL,
	"diseases" text
);
--> statement-breakpoint
CREATE TABLE "dispensaries" (
	"id" integer NOT NULL,
	"clinic_id" integer,
	"name" text NOT NULL,
	"password" text,
	"designation" text NOT NULL,
	"gender" text NOT NULL,
	"mobile" text NOT NULL,
	"mobile2" text NOT NULL,
	"email" text NOT NULL,
	"dept" integer NOT NULL,
	"city" text NOT NULL,
	"address" text NOT NULL,
	"about" text NOT NULL,
	"date_birth" date NOT NULL,
	"date_left" date NOT NULL,
	"salary_cur" real NOT NULL,
	"deleted_at" timestamp,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "doctor_availability" (
	"id" integer NOT NULL,
	"doctor_id" integer NOT NULL,
	"day_of_week" integer NOT NULL,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	"is_available" boolean,
	"created_at" timestamp,
	"updated_at" timestamp,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "doctors" (
	"id" integer NOT NULL,
	"clinic_id" integer,
	"name" text NOT NULL,
	"password" text,
	"title" text,
	"firstname" text,
	"middlename" text,
	"surname" text,
	"qualification" text,
	"instutitue" text,
	"passedout" text,
	"permanentaddress" text,
	"joiningdate" date,
	"registrationId" text,
	"aadharnumber" text,
	"profilepic" text,
	"pannumber" text,
	"10_document" text,
	"12_document" text,
	"bhms_document" text,
	"md_document" text,
	"registration_certificate" text,
	"aadhar_card" text,
	"pan_card" text,
	"appointment_letter" text,
	"designation" text NOT NULL,
	"gender" text NOT NULL,
	"mobile" text NOT NULL,
	"mobile2" text NOT NULL,
	"email" text NOT NULL,
	"dept" integer NOT NULL,
	"city" text NOT NULL,
	"address" text NOT NULL,
	"about" text NOT NULL,
	"date_birth" date NOT NULL,
	"date_left" date NOT NULL,
	"salary_cur" real NOT NULL,
	"consultation_fee" text,
	"deleted_at" timestamp,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "employees" (
	"id" integer NOT NULL,
	"name" text NOT NULL,
	"password" text,
	"designation" text NOT NULL,
	"gender" text NOT NULL,
	"mobile" text NOT NULL,
	"mobile2" text NOT NULL,
	"email" text NOT NULL,
	"dept" integer NOT NULL,
	"city" text NOT NULL,
	"address" text NOT NULL,
	"about" text NOT NULL,
	"date_birth" date NOT NULL,
	"date_left" date NOT NULL,
	"salary_cur" real NOT NULL,
	"packages" text NOT NULL,
	"deleted_at" timestamp,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" integer NOT NULL,
	"clinic_id" integer,
	"dateval" text,
	"exp_date" date,
	"head" integer,
	"amount" integer,
	"detail" text,
	"created_at" timestamp,
	"updated_at" timestamp,
	"deleted_at" text
);
--> statement-breakpoint
CREATE TABLE "expenseshead" (
	"id" integer NOT NULL,
	"expenseshead" text,
	"short_name" text,
	"created_at" timestamp,
	"updated_at" timestamp,
	"deleted_at" text
);
--> statement-breakpoint
CREATE TABLE "familygroup" (
	"id" integer NOT NULL,
	"regid" integer,
	"family_regid" integer,
	"name" text,
	"surname" text,
	"created_at" timestamp,
	"updated_at" timestamp,
	"deleted_at" text
);
--> statement-breakpoint
CREATE TABLE "familygroups" (
	"id" integer NOT NULL,
	"regid" integer NOT NULL,
	"member_regid" integer NOT NULL,
	"relation" text,
	"created_at" timestamp,
	"updated_at" timestamp,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "faqs" (
	"id" integer NOT NULL,
	"ques" text,
	"ans" text,
	"file" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"deleted_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "height_weights" (
	"id" integer NOT NULL,
	"regid" integer NOT NULL,
	"rand_id" integer,
	"dob" timestamp NOT NULL,
	"height" text,
	"weight" text,
	"blood_pressure" text,
	"lmp" text,
	"deleted_at" timestamp NOT NULL,
	"updated_at" timestamp,
	"created_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "heightweight" (
	"id" integer,
	"months" integer,
	"gender" text,
	"height" real,
	"weight" real
);
--> statement-breakpoint
CREATE TABLE "homeo_details" (
	"id" integer NOT NULL,
	"regid" integer,
	"homeo_date" text,
	"disease" text,
	"diagnosis" text,
	"constitutional" text,
	"complaint_intesity" text,
	"acute" text,
	"intercurrent" text,
	"thermal" text,
	"medication_taking" text,
	"medicine_time" text,
	"medicine_for" text,
	"medicine_price" text,
	"prognosis" text,
	"define_criteria1" text,
	"investigation" text,
	"define_criteria2" text,
	"case_taken" text,
	"criteria" text,
	"total_charges" integer NOT NULL,
	"deleted_at" timestamp,
	"updated_at" timestamp,
	"created_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "knex_migrations" (
	"id" integer NOT NULL,
	"name" text,
	"batch" integer,
	"migration_time" timestamp
);
--> statement-breakpoint
CREATE TABLE "knex_migrations_lock" (
	"index" integer NOT NULL,
	"is_locked" integer
);
--> statement-breakpoint
CREATE TABLE "la_configs" (
	"id" integer NOT NULL,
	"key" text NOT NULL,
	"section" text NOT NULL,
	"value" text NOT NULL,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "la_menus" (
	"id" integer NOT NULL,
	"name" text NOT NULL,
	"url" text NOT NULL,
	"icon" text NOT NULL,
	"type" text NOT NULL,
	"parent" integer NOT NULL,
	"hierarchy" integer NOT NULL,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "lab_order_items" (
	"id" integer NOT NULL,
	"lab_order_id" integer NOT NULL,
	"test_name" text NOT NULL,
	"test_code" text,
	"category" text,
	"priority" text,
	"status" text,
	"result" text,
	"result_value" text,
	"reference_range" text,
	"unit" text,
	"flag" text,
	"result_at" timestamp,
	"notes" text,
	"ai_suggested" boolean,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "lab_orders" (
	"id" integer NOT NULL,
	"tenant_id" integer,
	"visit_id" integer NOT NULL,
	"patient_id" integer NOT NULL,
	"ordered_by" integer,
	"status" text,
	"notes" text,
	"ordered_at" timestamp,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "lead" (
	"id" integer NOT NULL,
	"assigned_to" integer,
	"default_date" date,
	"name" text,
	"address" text,
	"city" text,
	"email" text,
	"age" text,
	"sex" text,
	"phone_no" text,
	"source" text,
	"treatment" text,
	"reminder" date,
	"status" text,
	"leadtype" text,
	"documented" text,
	"created_at" timestamp,
	"updated_at" timestamp,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "lead_followups" (
	"id" integer NOT NULL,
	"lead_id" integer NOT NULL,
	"name" text,
	"attachments" text,
	"task" text,
	"taskstatus" text,
	"deleted_at" timestamp,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" integer NOT NULL,
	"name" text NOT NULL,
	"mobile" text,
	"phone" text,
	"email" text,
	"address" text,
	"source" text,
	"status" text,
	"notes" text,
	"assigned_to" integer,
	"follow_up_date" date,
	"created_at" timestamp,
	"updated_at" timestamp,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "managetreedatas" (
	"id" integer NOT NULL,
	"label" text,
	"parent_id" integer,
	"hindi_label" text,
	"gujrati_label" text,
	"punjabi_label" text,
	"malyalum_label" text,
	"kannad_label" text,
	"bengali_label" text,
	"marathi_label" text,
	"french_label" text,
	"german_label" text,
	"spanish_label" text,
	"created_at" timestamp,
	"updated_at" timestamp,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "medicalcases" (
	"id" integer NOT NULL,
	"clinic_id" integer,
	"regid" integer,
	"dob" text,
	"name" text,
	"designation" text,
	"gender" text,
	"mobile" text,
	"mobile2" text,
	"doctorname" text,
	"dept" integer,
	"city" text,
	"address" text,
	"alt_address" text,
	"about" text,
	"date_birth" text,
	"filter_dob" date,
	"consultation_fee" text,
	"package" integer,
	"package_start" text,
	"date_left" text,
	"package_enddate" text,
	"salary_cur" real,
	"scancase" text,
	"deleted_at" timestamp,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "medicines" (
	"ID" integer,
	"shortname" text,
	"remedy" text
);
--> statement-breakpoint
CREATE TABLE "migrations" (
	"migration" text NOT NULL,
	"batch" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mk_question_options" (
	"id" bigint NOT NULL,
	"title" text,
	"value" text,
	"description" text,
	"status" boolean NOT NULL,
	"order" bigint,
	"question_id" bigint,
	"created_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "mk_question_relation" (
	"id" bigint NOT NULL,
	"term_id" bigint,
	"question_id" bigint
);
--> statement-breakpoint
CREATE TABLE "mk_questions" (
	"id" bigint NOT NULL,
	"question_title" text,
	"question_desc" text,
	"is_required" boolean NOT NULL,
	"status" boolean NOT NULL,
	"order" bigint,
	"meta_data" text,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "mk_terms" (
	"id" integer NOT NULL,
	"term_id" bigint NOT NULL,
	"user_id" bigint,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"order" bigint NOT NULL,
	"term_type" text,
	"description" text,
	"parent" bigint,
	"term_status" boolean,
	"featured_image" text,
	"created_at" timestamp,
	"updated_at" timestamp,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "mmc_medicines" (
	"id" integer NOT NULL,
	"name" text,
	"detail" text,
	"medicine_name" text,
	"related_diseases" text,
	"created_at" timestamp,
	"updated_at" timestamp,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "module_field_types" (
	"id" integer NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "module_fields" (
	"id" integer NOT NULL,
	"colname" text NOT NULL,
	"label" text NOT NULL,
	"module" integer NOT NULL,
	"field_type" integer NOT NULL,
	"unique" boolean NOT NULL,
	"defaultvalue" text NOT NULL,
	"minlength" integer NOT NULL,
	"maxlength" integer NOT NULL,
	"required" boolean NOT NULL,
	"popup_vals" text NOT NULL,
	"sort" integer NOT NULL,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "modules" (
	"id" integer NOT NULL,
	"name" text NOT NULL,
	"label" text NOT NULL,
	"name_db" text NOT NULL,
	"view_col" text NOT NULL,
	"model" text NOT NULL,
	"controller" text NOT NULL,
	"fa_icon" text NOT NULL,
	"is_gen" boolean NOT NULL,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "notes" (
	"id" integer NOT NULL,
	"regid" integer,
	"rand_id" integer,
	"dateval" text,
	"notes" text,
	"notes_type" text,
	"created_at" timestamp,
	"updated_at" timestamp,
	"deleted_at" text
);
--> statement-breakpoint
CREATE TABLE "occupation" (
	"id" integer NOT NULL,
	"occupation" text
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" integer NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"website" text NOT NULL,
	"assigned_to" integer NOT NULL,
	"connect_since" date NOT NULL,
	"address" text NOT NULL,
	"city" text NOT NULL,
	"description" text NOT NULL,
	"profile_image" integer NOT NULL,
	"profile" integer NOT NULL,
	"deleted_at" timestamp,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "packagehistory" (
	"id" integer NOT NULL,
	"packagedate" text,
	"regid" integer,
	"fromdate" text,
	"todate" text,
	"packageid" integer,
	"PackagePeriodID" integer,
	"created_at" timestamp,
	"updated_at" timestamp,
	"deleted_at" text
);
--> statement-breakpoint
CREATE TABLE "packages" (
	"id" integer NOT NULL,
	"name" text,
	"tags" text,
	"color" text,
	"expiry_date" text,
	"created_at" timestamp,
	"updated_at" timestamp,
	"deleted_at" text
);
--> statement-breakpoint
CREATE TABLE "password_resets" (
	"email" text NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" integer NOT NULL,
	"case_id" integer,
	"patient_name" text,
	"doctor_id" text,
	"consultation_fee" integer,
	"medicine_price" integer,
	"received_price" integer,
	"payment_mode" text,
	"received_date" text,
	"payment_date" text,
	"created_at" timestamp,
	"updated_at" timestamp,
	"deleted_at" text,
	"regid" text,
	"bill_id" integer,
	"order_id" text,
	"payment_id" text,
	"signature" text,
	"amount" real,
	"currency" text,
	"status" text
);
--> statement-breakpoint
CREATE TABLE "pdf_content" (
	"id" integer NOT NULL,
	"name" text,
	"tag_line" text,
	"tag_line1" text,
	"logo" text,
	"address1" text,
	"address2" text,
	"address3" text,
	"address4" text
);
--> statement-breakpoint
CREATE TABLE "pending_appointments" (
	"id" integer NOT NULL,
	"regid" integer,
	"rand_id" integer,
	"last_date" text,
	"next_date" text,
	"billid" integer,
	"call_status" text,
	"call_date" text,
	"days" text,
	"created_at" timestamp,
	"updated_at" timestamp,
	"deleted_at" text
);
--> statement-breakpoint
CREATE TABLE "permission_role" (
	"permission_id" integer NOT NULL,
	"role_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "permissions" (
	"id" integer NOT NULL,
	"name" text NOT NULL,
	"display_name" text NOT NULL,
	"description" text NOT NULL,
	"deleted_at" timestamp,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "potencies" (
	"id" integer NOT NULL,
	"name" text,
	"detail" text,
	"created_at" timestamp,
	"updated_at" timestamp,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "potencies1" (
	"id" integer NOT NULL,
	"name" text,
	"created_at" timestamp,
	"updated_at" timestamp,
	"deleted_at" text
);
--> statement-breakpoint
CREATE TABLE "rRemedy" (
	"ID" real NOT NULL,
	"ShortName" text,
	"Remedy" text,
	"Thermal" real,
	"AccuteThermal" real,
	"SideAffection" real,
	"Thirst" real,
	"AccuteThirst" real,
	"CommonName" text,
	"ClassificationID" real,
	"SubClass1ID" real,
	"SubClass2ID" real,
	"Family1ID" real,
	"Family2ID" real,
	"Miasm" text
);
--> statement-breakpoint
CREATE TABLE "receipt" (
	"id" integer NOT NULL,
	"receiptdate" text,
	"dateval" text,
	"regid" integer,
	"amount" text,
	"mode" text,
	"created_at" timestamp,
	"updated_at" timestamp,
	"deleted_at" text
);
--> statement-breakpoint
CREATE TABLE "receptionists" (
	"id" integer NOT NULL,
	"clinic_id" text,
	"name" text NOT NULL,
	"password" text,
	"designation" text NOT NULL,
	"gender" text NOT NULL,
	"mobile" text NOT NULL,
	"mobile2" text NOT NULL,
	"email" text NOT NULL,
	"dept" integer NOT NULL,
	"city" text NOT NULL,
	"address" text NOT NULL,
	"about" text NOT NULL,
	"date_birth" date NOT NULL,
	"date_left" date NOT NULL,
	"salary_cur" real NOT NULL,
	"deleted_at" timestamp,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "records" (
	"id" integer NOT NULL,
	"clinic_id" integer,
	"regid" text,
	"comment" text,
	"name" text,
	"doctorname" text,
	"mobile" text,
	"recordtype" text,
	"alt_address" text,
	"address" text,
	"pin" text,
	"balance" text,
	"duedate" text,
	"recorddate" text,
	"mobile2" text,
	"packageexpiry" text,
	"instructions" text,
	"calltime" text,
	"done" text,
	"created_at" text,
	"updated_at" timestamp,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "referral" (
	"id" integer NOT NULL,
	"regid" integer,
	"referral_id" text,
	"total_amount" text,
	"used_amount" text,
	"created_at" timestamp,
	"updated_at" timestamp,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "refrencetype" (
	"id" integer NOT NULL,
	"referencetype" text,
	"created_at" timestamp,
	"updated_at" timestamp,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "religion" (
	"id" integer NOT NULL,
	"religion" text
);
--> statement-breakpoint
CREATE TABLE "role_module" (
	"id" integer NOT NULL,
	"role_id" integer NOT NULL,
	"module_id" integer NOT NULL,
	"acc_view" boolean NOT NULL,
	"acc_create" boolean NOT NULL,
	"acc_edit" boolean NOT NULL,
	"acc_delete" boolean NOT NULL,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "role_module_fields" (
	"id" integer NOT NULL,
	"role_id" integer NOT NULL,
	"field_id" integer NOT NULL,
	"access" text NOT NULL,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "role_user" (
	"id" integer NOT NULL,
	"role_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" integer NOT NULL,
	"name" text NOT NULL,
	"display_name" text NOT NULL,
	"description" text NOT NULL,
	"parent" integer NOT NULL,
	"dept" integer NOT NULL,
	"deleted_at" timestamp,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "rubric_remedy_map" (
	"id" integer NOT NULL,
	"rubric_id" integer,
	"remedy_id" integer,
	"weight" integer
);
--> statement-breakpoint
CREATE TABLE "rubric_remid_mapping" (
	"id" integer NOT NULL,
	"regid" integer,
	"remid" integer,
	"weight" integer,
	"created_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "rubrics" (
	"id" integer NOT NULL,
	"category" text,
	"description" text,
	"chapter" text,
	"created_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "scribing_sessions" (
	"id" integer NOT NULL,
	"tenant_id" integer,
	"visit_id" integer NOT NULL,
	"user_id" integer,
	"status" text,
	"language" text,
	"total_duration_ms" integer,
	"metadata" jsonb,
	"started_at" timestamp,
	"ended_at" timestamp,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "settargets" (
	"id" integer NOT NULL,
	"doctor_id" integer,
	"target_amount" real,
	"target_month" integer,
	"target_year" integer,
	"target_type" text,
	"amount" integer,
	"month_target" date,
	"created_at" timestamp,
	"updated_at" timestamp,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "smsreport" (
	"id" integer NOT NULL,
	"regid" integer NOT NULL,
	"send_date" text NOT NULL,
	"sms_type" text NOT NULL,
	"message" text,
	"phone" text,
	"created_at" timestamp,
	"updated_at" timestamp,
	"deleted_at" text
);
--> statement-breakpoint
CREATE TABLE "smstemplate" (
	"id" integer NOT NULL,
	"templatename" text NOT NULL,
	"message" text,
	"smstype" text,
	"created_at" timestamp,
	"updated_at" timestamp,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "soap_notes" (
	"id" integer NOT NULL,
	"visit_id" integer NOT NULL,
	"subjective" text,
	"objective" text,
	"assessment" text,
	"plan" text,
	"advice" text,
	"follow_up" text,
	"icd_codes" jsonb,
	"ai_generated" boolean,
	"ai_confidence" real,
	"doctor_approved" boolean,
	"approved_at" timestamp,
	"specialty_data" jsonb,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "staticpages" (
	"id" integer NOT NULL,
	"name" text NOT NULL,
	"url" text,
	"content" text,
	"phone" text NOT NULL,
	"website" text NOT NULL,
	"assigned_to" integer NOT NULL,
	"connect_since" date NOT NULL,
	"address" text NOT NULL,
	"city" text NOT NULL,
	"description" text NOT NULL,
	"profile_image" integer NOT NULL,
	"profile" integer NOT NULL,
	"deleted_at" timestamp,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "status" (
	"id" integer NOT NULL,
	"status" text
);
--> statement-breakpoint
CREATE TABLE "stocks" (
	"id" integer NOT NULL,
	"name" text,
	"description" text,
	"deleted_at" text,
	"created_at" timestamp,
	"updated_at" timestamp,
	"potency" text,
	"ml" text,
	"status" text
);
--> statement-breakpoint
CREATE TABLE "subdomains" (
	"id" integer NOT NULL,
	"name" text,
	"start_date" text,
	"end_date" text,
	"updated_at" timestamp,
	"created_at" timestamp,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "table_name" (
	"ID" real,
	"RegID" real,
	"TitleID" real,
	"Name" text,
	"Surname" text,
	"Middlename" text,
	"DateOfBirth" text,
	"Gender" text,
	"StatusID" real,
	"Address" text,
	"Disease" text,
	"Constitutional" text,
	"Thermal" text,
	"DateOfEntry" text,
	"EndDate" text,
	"Mobile1" real,
	"Area" text,
	"City" text,
	"State" text,
	"PIN" real,
	"RefBy" real,
	"AssistantDoctorID" real,
	"Road" text
);
--> statement-breakpoint
CREATE TABLE "temp_appliedcharges" (
	"ID" integer,
	"ChargesDate" text,
	"PersonalID" integer,
	"ChargesID" integer,
	"Amount" integer
);
--> statement-breakpoint
CREATE TABLE "temp_bill" (
	"ID" integer,
	"PersonalID" integer,
	"Treatment" text,
	"Disease" text,
	"FromDate" text,
	"ToDate" text,
	"Rupess" integer,
	"BillNo" integer,
	"DoctorID" integer,
	"RupeesInAmount" text,
	"Days" text,
	"BillDate" text,
	"Charges" integer,
	"Received" integer,
	"Balance" integer,
	"BalanceInAmount" text,
	"ReceivedInAmount" text
);
--> statement-breakpoint
CREATE TABLE "temp_communication" (
	"ID" integer,
	"RegID" text,
	"CommunicationDate" text,
	"Comments" text,
	"Viewed" text
);
--> statement-breakpoint
CREATE TABLE "temp_deposit" (
	"ID" integer,
	"RecordDate" text,
	"CashBalance" text,
	"BankDeposit" text,
	"Comments" text,
	"Submitted" text,
	"DateOfSubmission" text
);
--> statement-breakpoint
CREATE TABLE "temp_doctors" (
	"ID" integer,
	"AssistantDoctor" text,
	"PasswordString" text
);
--> statement-breakpoint
CREATE TABLE "temp_expense" (
	"ID" integer NOT NULL,
	"ExpensesDate" text,
	"ExpensesHeadID" text,
	"Amount" text,
	"Detail" text
);
--> statement-breakpoint
CREATE TABLE "temp_expensehead" (
	"ID" integer NOT NULL,
	"ExpensesHead" text,
	"ShortName" text
);
--> statement-breakpoint
CREATE TABLE "temp_followup" (
	"ID" integer,
	"FollowupDate" text,
	"PersonalID" text,
	"RemedyID" text,
	"PotencyID" text,
	"FrequencyID" text,
	"DaysID" text,
	"DiseaseID" text,
	"Evaluation" text,
	"Additional" text,
	"WaitTime" text,
	"MedicineMethod" text,
	"POD" text,
	"MedicineGiven" text,
	"CourierCompany" text
);
--> statement-breakpoint
CREATE TABLE "temp_followup2" (
	"FollowupID" integer,
	"Followup" text
);
--> statement-breakpoint
CREATE TABLE "temp_heightweight" (
	"ID" integer,
	"RegID" integer,
	"RecordDate" text,
	"Height" text,
	"Weight" text
);
--> statement-breakpoint
CREATE TABLE "temp_investigation" (
	"ID" integer,
	"PersonalID" integer,
	"InvestigationDate" text,
	"AntiStreptolysin" text,
	"ACCP" text,
	"RA" text,
	"AlkalinePhosphatase" text,
	"Complement4" text,
	"ANA" text,
	"ReactiveProtein" text,
	"Homocysteine" text,
	"ECG" text,
	"2DECHO" text,
	"InvestigationCBCRBC" text,
	"HB" text,
	"WBC" text,
	"Platelets" text,
	"Neutrophilis" text,
	"Lymphocyte" text,
	"Eosinophilis" text,
	"Monocytes" text,
	"Basophilis" text,
	"Bandcells" text,
	"ARBC" text,
	"Parasites" text,
	"AWBC" text,
	"ESR" text,
	"VitaminB12" text,
	"OhVitaminD" text,
	"BFasting" text,
	"BPost" text,
	"BRandom" text,
	"UFasting" text,
	"UPost" text,
	"URandom" text,
	"GluTest" text,
	"GlyHB" text,
	"T3" text,
	"T4" text,
	"TSH" text,
	"AntiTPO" text,
	"AntibodyThyroglobulin" text,
	"Prolactin" text,
	"FSHDay3" text,
	"LHSurge" text,
	"ProgesteroneDay3" text,
	"Progesterone" text,
	"DHEA" text,
	"Testosterone" text,
	"AMA" text,
	"FastingInsulin" text,
	"FT3" text,
	"FT4" text,
	"InvestigationEndocrineSmsSend" text,
	"IgG" text,
	"IgE" text,
	"IgM" text,
	"IgA" text,
	"Ttg" text,
	"TotalChol" text,
	"HdiChol" text,
	"LdlChol" text,
	"Hdlc" text,
	"Trigly" text,
	"Lipoprotein" text,
	"ApolipoproteinA1" text,
	"ApolipoproteinB" text,
	"VLDL" text,
	"LDL_HDL" text,
	"TotalBil" text,
	"DirBil" text,
	"IndBil" text,
	"BUN" text,
	"GammaGT" text,
	"TotalProtiens" text,
	"Albumin" text,
	"Globilin" text,
	"SGPT" text,
	"SGOT" text,
	"AlkPhos" text,
	"Aust" text,
	"Amylase" text,
	"ProstateSize" text,
	"ProstateVolume" text,
	"Serum" text,
	"InvestigationMaleUSGOtherfindings" text,
	"Radiology" text,
	"Urea" text,
	"Creatinine" text,
	"UricAcid" text,
	"Calcium" text,
	"Phosphorus" text,
	"Sodium" text,
	"Potassium" text,
	"Chloride" text,
	"SemenAnalysis" text,
	"SerologyReport" text,
	"Field1" text,
	"Field2" text,
	"Field3" text,
	"Field4" text,
	"InvestigationStoolColor" text,
	"Consistancy" text,
	"Mucus" text,
	"FrankBlood" text,
	"AdultWorm" text,
	"InvestigationStoolReaction" text,
	"InvestigationStoolPusCells" text,
	"InvestigationStoolOccultBlood" text,
	"Macrophages" text,
	"InvestigationStoolRBC" text,
	"OVA" text,
	"Cysts" text,
	"Protozoa" text,
	"YeastCells" text,
	"InvestigationStoolOtherFindings" text,
	"Quantity" text,
	"InvestigationUrineColor" text,
	"Appearance" text,
	"InvestigationUrineReaction" text,
	"GRA" text,
	"Protien" text,
	"Sugar" text,
	"Acetone" text,
	"BilePigments" text,
	"InvestigationUrineOccultBlood" text,
	"Urobili" text,
	"EpithCells" text,
	"InvestigationUrinePusCells" text,
	"InvestigationUrineRBC" text,
	"InvestigationUrineOtherFindings" text,
	"SizeRt" text,
	"SizeLt" text,
	"VolumeRt" text,
	"VolumeLt" text,
	"FolliclesRt" text,
	"FolliclesLt" text,
	"EndometrialThickness" text,
	"UterusSize" text,
	"FibroidsNumber" text,
	"Description" text,
	"InvestigationUSGSmsSend" text,
	"25OhVitaminD" text,
	"LDLHDL" text
);
--> statement-breakpoint
CREATE TABLE "temp_personal" (
	"ID" integer,
	"RegID" integer,
	"DoctorID" integer,
	"FamilyID" integer,
	"TitleID" integer,
	"Name" text,
	"Surname" text,
	"Middlename" text,
	"DateOfBirth" text,
	"Gender" text,
	"StatusID" integer,
	"Address" text,
	"Disease" text,
	"Constitutional" text,
	"Acute" text,
	"InterCurrent" text,
	"OccupationID" integer,
	"ReligionID" integer,
	"Phone" text,
	"GHPScore" text,
	"Prognosis" text,
	"Thermal" text,
	"AnalysisPath" text,
	"Extra1" text,
	"Extra2" text,
	"DateOfLastUpdate" text,
	"DateOfEntry" text,
	"Email" text,
	"SchemeId" integer,
	"EndDate" text,
	"Mobile1" bigint,
	"Mobile2" text,
	"SMSAlert" text,
	"Area" text,
	"City" text,
	"State" text,
	"PIN" text,
	"RefID" text,
	"RefBy" integer,
	"AssistantDoctorID" integer,
	"Road" text,
	"Diagnosis" text,
	"ComplaintIntensity" text,
	"MedicationTaking" text,
	"Investigation" text,
	"Outstation" text,
	"PackageID" text,
	"PackageSMSAlert" text,
	"Field1" text,
	"Field2" text,
	"Field3" text,
	"Field4" text,
	"SmsSent" text,
	"CaseUploaded" text,
	"Skin" text,
	"DisabilityDisorder" text,
	"PCOD" text,
	"Tyroid" text,
	"CallCenterUploaded" text,
	"IsGoodCase" text,
	"LifestyleDisorder" text
);
--> statement-breakpoint
CREATE TABLE "temp_personal12" (
	"ID" integer,
	"RegID" integer,
	"DoctorID" integer,
	"FamilyID" integer,
	"TitleID" integer,
	"Name" text,
	"Surname" text,
	"Middlename" text,
	"DateOfBirth" text,
	"Gender" text,
	"StatusID" integer,
	"Address" text,
	"Disease" text,
	"Constitutional" text,
	"Acute" text,
	"InterCurrent" text,
	"OccupationID" integer,
	"ReligionID" integer,
	"Phone" text,
	"DateOfLastUpdate" text,
	"DateOfEntry" text,
	"Email" text,
	"SchemeId" text,
	"EndDate" text,
	"Mobile1" text,
	"Mobile2" text,
	"SMSAlert" text,
	"Area" text,
	"City" text,
	"State" text,
	"PIN" text,
	"RefID" text,
	"RefBy" text,
	"AssistantDoctorID" integer,
	"Road" text,
	"PackageID" integer,
	"GHPScore" text,
	"Prognosis" text
);
--> statement-breakpoint
CREATE TABLE "temp_personalnew" (
	"ID" integer NOT NULL,
	"RegID" text,
	"DateOfLastUpdate" text,
	"Diagnosis" text,
	"ComplaintIntensity" text,
	"MedicationTaking" text,
	"Investigation" text,
	"Skin" text,
	"DisabilityDisorder" text,
	"PCOD" text,
	"Tyroid" text,
	"LifestyleDisorder" text
);
--> statement-breakpoint
CREATE TABLE "temp_receipt" (
	"ID" integer NOT NULL,
	"ReceiptDate" text,
	"PersonalID" integer,
	"Amount" text,
	"Mode" text,
	"IsSmsSend" text
);
--> statement-breakpoint
CREATE TABLE "temp_record" (
	"ID" integer,
	"CallDate" text,
	"RegID" text,
	"CallerName" text,
	"Mobile1" bigint,
	"Mobile2" text,
	"Instructions" text,
	"CallType" text,
	"CallTime" text,
	"Done" text
);
--> statement-breakpoint
CREATE TABLE "temp_reminder" (
	"id" integer,
	"patient_name" text,
	"start_date" text,
	"heading" text,
	"comments" text,
	"Done" text,
	"created_at" text,
	"updated_at" text,
	"deleted_at" text
);
--> statement-breakpoint
CREATE TABLE "temp_target" (
	"ID" integer,
	"TargetMonth" text,
	"NewCase" integer,
	"Collection" integer
);
--> statement-breakpoint
CREATE TABLE "test_ans" (
	"id" integer NOT NULL,
	"quesid" integer NOT NULL,
	"ans" text,
	"a" text,
	"b" text,
	"c" text,
	"d" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"deleted_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "test_ques" (
	"id" integer NOT NULL,
	"ques" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"deleted_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "test_users" (
	"id" integer NOT NULL,
	"jobtitle" text NOT NULL,
	"email" text NOT NULL,
	"mobile" text NOT NULL,
	"created_at" timestamp,
	"updated_at" timestamp,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "title" (
	"id" integer,
	"title" text
);
--> statement-breakpoint
CREATE TABLE "tmpbank_deposit" (
	"ID" real,
	"RecordDate" text,
	"CashBalance" text,
	"BankDeposit" text,
	"Comments" text,
	"Submitted" text,
	"DateOfSubmission" text
);
--> statement-breakpoint
CREATE TABLE "token" (
	"id" integer NOT NULL,
	"clinic_id" integer,
	"regid" integer,
	"dateval" text,
	"rowcolor" integer,
	"token_no" integer,
	"created_at" timestamp,
	"updated_at" timestamp,
	"deleted_at" text,
	"status" text
);
--> statement-breakpoint
CREATE TABLE "transcript_segments" (
	"id" integer NOT NULL,
	"session_id" integer NOT NULL,
	"sequence_number" integer NOT NULL,
	"text" text NOT NULL,
	"speaker" text,
	"confidence" real,
	"start_time_ms" integer NOT NULL,
	"end_time_ms" integer NOT NULL,
	"is_final" boolean,
	"source" text,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "trial" (
	"id" integer NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"verify_phone" text,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"clinic_name" text NOT NULL,
	"address" text NOT NULL,
	"created_at" timestamp,
	"updated_at" timestamp,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "upload_picture" (
	"id" integer NOT NULL,
	"regid" integer NOT NULL,
	"rand_id" integer NOT NULL,
	"picture" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp,
	"deleted_at" text
);
--> statement-breakpoint
CREATE TABLE "uploads" (
	"id" integer NOT NULL,
	"name" text NOT NULL,
	"path" text NOT NULL,
	"extension" text NOT NULL,
	"caption" text NOT NULL,
	"user_id" integer NOT NULL,
	"hash" text NOT NULL,
	"public" boolean NOT NULL,
	"deleted_at" timestamp,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "user_profiles" (
	"id" bigint NOT NULL,
	"user_id" bigint NOT NULL,
	"firstname" text,
	"lastname" text,
	"birthdate" date,
	"gender" text,
	"address" text,
	"phone" text,
	"image" text,
	"created_at" timestamp,
	"updated_at" timestamp,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" integer NOT NULL,
	"name" text NOT NULL,
	"context_id" integer NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"type" text NOT NULL,
	"gender" text,
	"mobile" text,
	"city" text,
	"address" text,
	"about" text,
	"remember_token" text,
	"amount" text,
	"plan_name" text,
	"unread" integer,
	"deleted_at" timestamp,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "users_helloter" (
	"id" integer NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"otp" text,
	"email_verified_at" timestamp,
	"remember_token" text,
	"created_at" timestamp,
	"updated_at" timestamp,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "vaccinedatas" (
	"id" integer NOT NULL,
	"label" text,
	"parent_id" integer,
	"created_at" timestamp,
	"updated_at" timestamp,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "vitals" (
	"id" integer NOT NULL,
	"visit_id" integer NOT NULL,
	"height_cm" real,
	"weight_kg" real,
	"bmi" real,
	"temperature_f" real,
	"pulse_rate" integer,
	"systolic_bp" integer,
	"diastolic_bp" integer,
	"respiratory_rate" integer,
	"oxygen_saturation" real,
	"blood_sugar" real,
	"notes" text,
	"recorded_at" timestamp,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "waitingstatus" (
	"id" integer NOT NULL,
	"regid" integer,
	"appointment_id" integer,
	"waiting_number" integer,
	"date" date,
	"time" text,
	"doctor_id" integer,
	"consultation_fees" integer,
	"status" integer,
	"checked_in_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp,
	"updated_at" timestamp,
	"deleted_at" timestamp
);
