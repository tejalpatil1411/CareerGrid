-- CareerGrid sample records. Run after 01_schema.sql and 02_triggers.sql.
-- Opportunity windows are relative to the run date so application-trigger examples work.
USE CareerGrid;

INSERT INTO ADMIN (admin_id, full_name, email, role_name, is_active) VALUES
(1, 'Ananya Rao', 'ananya.rao@careergrid.example', 'PlacementAdmin', TRUE),
(2, 'Rohan Mehta', 'rohan.mehta@careergrid.example', 'Coordinator', TRUE);

INSERT INTO COMPANY (company_id, company_name, website, industry, location, contact_email) VALUES
(1, 'Aster Analytics', 'https://aster.example', 'Data Analytics', 'Bengaluru', 'careers@aster.example'),
(2, 'BluePeak Systems', 'https://bluepeak.example', 'Information Technology', 'Pune', 'jobs@bluepeak.example'),
(3, 'Cedar Motors', 'https://cedar.example', 'Automotive', 'Chennai', 'campus@cedar.example'),
(4, 'Delta Fintech', 'https://deltafintech.example', 'Financial Technology', 'Mumbai', 'talent@deltafintech.example'),
(5, 'Evergreen Energy', 'https://evergreen.example', 'Renewable Energy', 'Hyderabad', 'careers@evergreen.example'),
(6, 'Fable Networks', 'https://fable.example', 'Telecommunications', 'Noida', 'campus@fable.example'),
(7, 'Granite Robotics', 'https://granite.example', 'Robotics', 'Bengaluru', 'jobs@granite.example'),
(8, 'Harbor Consulting', 'https://harbor.example', 'Consulting', 'Gurugram', 'people@harbor.example'),
(9, 'Indigo HealthTech', 'https://indigo.example', 'Health Technology', 'Kochi', 'careers@indigo.example'),
(10, 'Juniper Cloud', 'https://juniper.example', 'Cloud Services', 'Mumbai', 'talent@juniper.example');

INSERT INTO STUDENT
  (student_id, roll_no, full_name, email, phone, date_of_birth, department, graduation_year, cgpa) VALUES
(1,'CG2027-001','Aarav Sharma','aarav.sharma@student.example','+91-9000000001','2005-02-14','Computer Engineering',2027,9.10),
(2,'CG2027-002','Diya Iyer','diya.iyer@student.example','+91-9000000002','2005-05-21','Electronics',2027,8.72),
(3,'CG2027-003','Kabir Nair','kabir.nair@student.example','+91-9000000003','2004-11-03','Mechanical',2027,8.15),
(4,'CG2027-004','Meera Joshi','meera.joshi@student.example','+91-9000000004','2005-01-19','Electrical',2027,7.94),
(5,'CG2027-005','Ishaan Patel','ishaan.patel@student.example','+91-9000000005','2004-08-30','Information Technology',2027,9.42),
(6,'CG2027-006','Anika Das','anika.das@student.example','+91-9000000006','2005-03-08','Civil',2027,7.38),
(7,'CG2027-007','Vivaan Kulkarni','vivaan.k@student.example','+91-9000000007','2004-12-17','Computer Engineering',2027,8.56),
(8,'CG2027-008','Sara Khan','sara.khan@student.example','+91-9000000008','2005-06-11','Electronics',2027,7.62),
(9,'CG2027-009','Arjun Reddy','arjun.reddy@student.example','+91-9000000009','2004-09-24','Mechanical',2027,8.03),
(10,'CG2027-010','Ira Menon','ira.menon@student.example','+91-9000000010','2005-04-06','Electrical',2027,9.25),
(11,'CG2027-011','Reyansh Shah','reyansh.shah@student.example','+91-9000000011','2004-10-12','Information Technology',2027,6.88),
(12,'CG2027-012','Tara Banerjee','tara.banerjee@student.example','+91-9000000012','2005-07-29','Civil',2027,8.31),
(13,'CG2027-013','Aditya Rao','aditya.rao@student.example','+91-9000000013','2004-06-15','Computer Engineering',2027,7.72),
(14,'CG2027-014','Saanvi Verma','saanvi.verma@student.example','+91-9000000014','2005-02-27','Electronics',2027,8.91),
(15,'CG2027-015','Dhruv Sinha','dhruv.sinha@student.example','+91-9000000015','2004-07-04','Mechanical',2027,6.15),
(16,'CG2027-016','Myra Kapoor','myra.kapoor@student.example','+91-9000000016','2005-08-16','Electrical',2027,7.05),
(17,'CG2027-017','Atharv Desai','atharv.desai@student.example','+91-9000000017','2004-04-20','Information Technology',2027,8.44),
(18,'CG2027-018','Kiara Thomas','kiara.thomas@student.example','+91-9000000018','2005-09-02','Civil',2027,6.73),
(19,'CG2027-019','Krish Malhotra','krish.malhotra@student.example','+91-9000000019','2004-03-13','Computer Engineering',2027,9.63),
(20,'CG2027-020','Aditi Pillai','aditi.pillai@student.example','+91-9000000020','2005-10-25','Electronics',2027,8.07),
(21,'CG2027-021','Rudra Ghosh','rudra.ghosh@student.example','+91-9000000021','2004-05-09','Mechanical',2027,7.19),
(22,'CG2027-022','Nisha Bhat','nisha.bhat@student.example','+91-9000000022','2005-11-18','Electrical',2027,8.64),
(23,'CG2027-023','Yash Chawla','yash.chawla@student.example','+91-9000000023','2004-02-01','Information Technology',2027,7.25),
(24,'CG2027-024','Pia Fernandes','pia.fernandes@student.example','+91-9000000024','2005-12-07','Civil',2027,7.81),
(25,'CG2027-025','Dev Anand','dev.anand@student.example','+91-9000000025','2004-01-26','Computer Engineering',2027,8.22),
(26,'CG2027-026','Riya Mukherjee','riya.m@student.example','+91-9000000026','2005-03-31','Electronics',2027,6.42),
(27,'CG2027-027','Omkar Jadhav','omkar.j@student.example','+91-9000000027','2004-12-02','Mechanical',2027,7.57),
(28,'CG2027-028','Zoya Siddiqui','zoya.s@student.example','+91-9000000028','2005-05-14','Electrical',2027,8.76),
(29,'CG2027-029','Neil Dutta','neil.dutta@student.example','+91-9000000029','2004-08-08','Information Technology',2027,7.02),
(30,'CG2027-030','Mira Krishnan','mira.k@student.example','+91-9000000030','2005-06-23','Civil',2027,6.91),
(31,'CG2027-031','Samar Arora','samar.arora@student.example','+91-9000000031','2005-01-05','Computer Engineering',2028,8.11),
(32,'CG2027-032','Lavanya Shetty','lavanya.s@student.example','+91-9000000032','2005-04-17','Electronics',2028,7.44),
(33,'CG2027-033','Parth Goel','parth.goel@student.example','+91-9000000033','2004-10-28','Mechanical',2028,6.08),
(34,'CG2027-034','Isha Roy','isha.roy@student.example','+91-9000000034','2005-07-03','Electrical',2028,9.02),
(35,'CG2027-035','Manav Puri','manav.puri@student.example','+91-9000000035','2005-02-09','Information Technology',2028,7.67),
(36,'CG2027-036','Kavya Rao','kavya.rao@student.example','+91-9000000036','2004-09-15','Civil',2028,8.48),
(37,'CG2027-037','Eshan Bose','eshan.bose@student.example','+91-9000000037','2005-11-27','Computer Engineering',2028,5.83),
(38,'CG2027-038','Navya Sethi','navya.sethi@student.example','+91-9000000038','2005-08-12','Electronics',2028,7.91),
(39,'CG2027-039','Ayaan Qureshi','ayaan.q@student.example','+91-9000000039','2004-07-22','Mechanical',2028,8.33),
(40,'CG2027-040','Sia Narang','sia.narang@student.example','+91-9000000040','2005-03-19','Electrical',2028,NULL);

INSERT INTO SKILL (skill_id, skill_name, skill_category) VALUES
(1,'Python','Programming'),(2,'Java','Programming'),(3,'C++','Programming'),
(4,'SQL','Database'),(5,'MySQL','Database'),(6,'HTML and CSS','Web'),
(7,'JavaScript','Web'),(8,'Data Analysis','Analytics'),(9,'Machine Learning','Analytics'),
(10,'AutoCAD','Design'),(11,'MATLAB','Engineering'),(12,'Embedded Systems','Engineering'),
(13,'Communication','Professional'),(14,'Git','Tools'),(15,'Excel','Tools');

-- First 15 openings are currently open within their windows; 16-18 are upcoming and 19-20 are closed.
INSERT INTO OPPORTUNITY
  (opportunity_id, company_id, created_by_admin_id, title, opportunity_type, description,
   location, stipend, salary, minimum_cgpa, open_date, deadline, status) VALUES
(1,1,1,'Data Analyst Intern','Internship','Prepare dashboards and validate business data.','Bengaluru',25000.00,NULL,6.00,DATE_SUB(CURRENT_TIMESTAMP,INTERVAL 30 DAY),DATE_ADD(CURRENT_TIMESTAMP,INTERVAL 30 DAY),'Open'),
(2,1,1,'Junior Data Engineer','Placement','Build reliable data pipelines with the analytics team.','Bengaluru',NULL,780000.00,7.00,DATE_SUB(CURRENT_TIMESTAMP,INTERVAL 25 DAY),DATE_ADD(CURRENT_TIMESTAMP,INTERVAL 35 DAY),'Open'),
(3,2,1,'Backend Developer Intern','Internship','Contribute to Python service APIs.','Pune',22000.00,NULL,6.00,DATE_SUB(CURRENT_TIMESTAMP,INTERVAL 28 DAY),DATE_ADD(CURRENT_TIMESTAMP,INTERVAL 28 DAY),'Open'),
(4,2,2,'Graduate Software Engineer','Placement','Join a product engineering team.','Pune',NULL,850000.00,7.00,DATE_SUB(CURRENT_TIMESTAMP,INTERVAL 26 DAY),DATE_ADD(CURRENT_TIMESTAMP,INTERVAL 32 DAY),'Open'),
(5,3,2,'Automotive Design Intern','Internship','Assist with CAD reviews and component documentation.','Chennai',18000.00,NULL,5.50,DATE_SUB(CURRENT_TIMESTAMP,INTERVAL 24 DAY),DATE_ADD(CURRENT_TIMESTAMP,INTERVAL 40 DAY),'Open'),
(6,4,1,'Fintech QA Intern','Internship','Write test cases for payment workflows.','Mumbai',20000.00,NULL,6.00,DATE_SUB(CURRENT_TIMESTAMP,INTERVAL 22 DAY),DATE_ADD(CURRENT_TIMESTAMP,INTERVAL 25 DAY),'Open'),
(7,4,1,'Associate Software Engineer','Placement','Support secure financial products.','Mumbai',NULL,920000.00,7.50,DATE_SUB(CURRENT_TIMESTAMP,INTERVAL 20 DAY),DATE_ADD(CURRENT_TIMESTAMP,INTERVAL 27 DAY),'Open'),
(8,5,2,'Renewable Energy Analyst','Internship','Analyze generation and site performance data.','Hyderabad',21000.00,NULL,6.00,DATE_SUB(CURRENT_TIMESTAMP,INTERVAL 21 DAY),DATE_ADD(CURRENT_TIMESTAMP,INTERVAL 31 DAY),'Open'),
(9,6,2,'Network Operations Trainee','Placement','Support monitoring and network reliability.','Noida',NULL,680000.00,6.00,DATE_SUB(CURRENT_TIMESTAMP,INTERVAL 19 DAY),DATE_ADD(CURRENT_TIMESTAMP,INTERVAL 29 DAY),'Open'),
(10,7,1,'Robotics Test Intern','Internship','Test sensors and document robot behavior.','Bengaluru',24000.00,NULL,6.50,DATE_SUB(CURRENT_TIMESTAMP,INTERVAL 18 DAY),DATE_ADD(CURRENT_TIMESTAMP,INTERVAL 24 DAY),'Open'),
(11,8,2,'Business Consulting Intern','Internship','Assist with research and client analysis.','Gurugram',23000.00,NULL,6.00,DATE_SUB(CURRENT_TIMESTAMP,INTERVAL 17 DAY),DATE_ADD(CURRENT_TIMESTAMP,INTERVAL 22 DAY),'Open'),
(12,9,1,'Health Data Associate','Placement','Help maintain reporting pipelines for clinical teams.','Kochi',NULL,720000.00,6.50,DATE_SUB(CURRENT_TIMESTAMP,INTERVAL 16 DAY),DATE_ADD(CURRENT_TIMESTAMP,INTERVAL 26 DAY),'Open'),
(13,10,2,'Cloud Support Intern','Internship','Assist with cloud deployment and incident notes.','Mumbai',26000.00,NULL,6.00,DATE_SUB(CURRENT_TIMESTAMP,INTERVAL 15 DAY),DATE_ADD(CURRENT_TIMESTAMP,INTERVAL 20 DAY),'Open'),
(14,3,1,'Mechanical Graduate Engineer','Placement','Support production engineering and quality teams.','Chennai',NULL,760000.00,6.00,DATE_SUB(CURRENT_TIMESTAMP,INTERVAL 14 DAY),DATE_ADD(CURRENT_TIMESTAMP,INTERVAL 33 DAY),'Open'),
(15,5,2,'Electrical Systems Intern','Internship','Support testing of inverter and power systems.','Hyderabad',19000.00,NULL,5.00,DATE_SUB(CURRENT_TIMESTAMP,INTERVAL 13 DAY),DATE_ADD(CURRENT_TIMESTAMP,INTERVAL 23 DAY),'Open'),
(16,6,1,'Network Security Associate','Placement','Upcoming opening for a security operations team.','Noida',NULL,880000.00,7.00,DATE_ADD(CURRENT_TIMESTAMP,INTERVAL 5 DAY),DATE_ADD(CURRENT_TIMESTAMP,INTERVAL 45 DAY),'Open'),
(17,8,2,'Consulting Analyst','Placement','Upcoming graduate analyst intake.','Gurugram',NULL,800000.00,7.00,DATE_ADD(CURRENT_TIMESTAMP,INTERVAL 7 DAY),DATE_ADD(CURRENT_TIMESTAMP,INTERVAL 50 DAY),'Open'),
(18,10,1,'Cloud Automation Intern','Internship','Upcoming internship in cloud operations.','Mumbai',27000.00,NULL,6.50,DATE_ADD(CURRENT_TIMESTAMP,INTERVAL 3 DAY),DATE_ADD(CURRENT_TIMESTAMP,INTERVAL 38 DAY),'Open'),
(19,7,2,'Robotics Graduate Engineer','Placement','Previous recruitment cycle.','Bengaluru',NULL,900000.00,7.00,DATE_SUB(CURRENT_TIMESTAMP,INTERVAL 90 DAY),DATE_SUB(CURRENT_TIMESTAMP,INTERVAL 20 DAY),'Closed'),
(20,9,1,'HealthTech Intern','Internship','Previous recruitment cycle.','Kochi',20000.00,NULL,6.00,DATE_SUB(CURRENT_TIMESTAMP,INTERVAL 80 DAY),DATE_SUB(CURRENT_TIMESTAMP,INTERVAL 15 DAY),'Closed');

-- Seventy distinct applications for students 1-25 across 15 openings.
-- Applications 1-10 are promoted below to Selected so the trigger creates ten offers.
INSERT INTO APPLICATION
  (application_id, student_id, opportunity_id, applied_at, status, resume_reference, remarks) VALUES
(1,1,1,DATE_SUB(CURRENT_TIMESTAMP,INTERVAL 10 DAY),'Applied','resumes/CG2027-001.pdf',NULL),
(2,1,2,DATE_SUB(CURRENT_TIMESTAMP,INTERVAL 9 DAY),'Applied','resumes/CG2027-001.pdf',NULL),
(3,2,3,DATE_SUB(CURRENT_TIMESTAMP,INTERVAL 8 DAY),'Applied','resumes/CG2027-002.pdf',NULL),
(4,2,4,DATE_SUB(CURRENT_TIMESTAMP,INTERVAL 7 DAY),'Applied','resumes/CG2027-002.pdf',NULL),
(5,3,5,DATE_SUB(CURRENT_TIMESTAMP,INTERVAL 11 DAY),'Applied','resumes/CG2027-003.pdf',NULL),
(6,3,6,DATE_SUB(CURRENT_TIMESTAMP,INTERVAL 6 DAY),'Applied','resumes/CG2027-003.pdf',NULL),
(7,4,7,DATE_SUB(CURRENT_TIMESTAMP,INTERVAL 5 DAY),'Applied','resumes/CG2027-004.pdf',NULL),
(8,4,8,DATE_SUB(CURRENT_TIMESTAMP,INTERVAL 12 DAY),'Applied','resumes/CG2027-004.pdf',NULL),
(9,5,9,DATE_SUB(CURRENT_TIMESTAMP,INTERVAL 4 DAY),'Applied','resumes/CG2027-005.pdf',NULL),
(10,5,10,DATE_SUB(CURRENT_TIMESTAMP,INTERVAL 3 DAY),'Applied','resumes/CG2027-005.pdf',NULL),
(11,6,1,DATE_SUB(CURRENT_TIMESTAMP,INTERVAL 9 DAY),'Under Review','resumes/CG2027-006.pdf',NULL),
(12,6,3,DATE_SUB(CURRENT_TIMESTAMP,INTERVAL 8 DAY),'Interview','resumes/CG2027-006.pdf',NULL),
(13,6,5,DATE_SUB(CURRENT_TIMESTAMP,INTERVAL 7 DAY),'Rejected','resumes/CG2027-006.pdf',NULL),
(14,7,2,DATE_SUB(CURRENT_TIMESTAMP,INTERVAL 6 DAY),'Shortlisted','resumes/CG2027-007.pdf',NULL),
(15,7,4,DATE_SUB(CURRENT_TIMESTAMP,INTERVAL 5 DAY),'Under Review','resumes/CG2027-007.pdf',NULL),
(16,7,6,DATE_SUB(CURRENT_TIMESTAMP,INTERVAL 4 DAY),'Applied','resumes/CG2027-007.pdf',NULL),
(17,8,7,DATE_SUB(CURRENT_TIMESTAMP,INTERVAL 12 DAY),'Interview','resumes/CG2027-008.pdf',NULL),
(18,8,9,DATE_SUB(CURRENT_TIMESTAMP,INTERVAL 11 DAY),'Rejected','resumes/CG2027-008.pdf',NULL),
(19,8,11,DATE_SUB(CURRENT_TIMESTAMP,INTERVAL 10 DAY),'Applied','resumes/CG2027-008.pdf',NULL),
(20,9,1,DATE_SUB(CURRENT_TIMESTAMP,INTERVAL 9 DAY),'Shortlisted','resumes/CG2027-009.pdf',NULL),
(21,9,4,DATE_SUB(CURRENT_TIMESTAMP,INTERVAL 8 DAY),'Applied','resumes/CG2027-009.pdf',NULL),
(22,9,8,DATE_SUB(CURRENT_TIMESTAMP,INTERVAL 7 DAY),'Withdrawn','resumes/CG2027-009.pdf','Accepted another interview schedule.'),
(23,10,2,DATE_SUB(CURRENT_TIMESTAMP,INTERVAL 6 DAY),'Interview','resumes/CG2027-010.pdf',NULL),
(24,10,6,DATE_SUB(CURRENT_TIMESTAMP,INTERVAL 5 DAY),'Under Review','resumes/CG2027-010.pdf',NULL),
(25,10,12,DATE_SUB(CURRENT_TIMESTAMP,INTERVAL 4 DAY),'Applied','resumes/CG2027-010.pdf',NULL),
(26,11,3,DATE_SUB(CURRENT_TIMESTAMP,INTERVAL 10 DAY),'Rejected','resumes/CG2027-011.pdf',NULL),
(27,11,5,DATE_SUB(CURRENT_TIMESTAMP,INTERVAL 9 DAY),'Applied','resumes/CG2027-011.pdf',NULL),
(28,11,9,DATE_SUB(CURRENT_TIMESTAMP,INTERVAL 8 DAY),'Under Review','resumes/CG2027-011.pdf',NULL),
(29,12,1,DATE_SUB(CURRENT_TIMESTAMP,INTERVAL 7 DAY),'Interview','resumes/CG2027-012.pdf',NULL),
(30,12,7,DATE_SUB(CURRENT_TIMESTAMP,INTERVAL 6 DAY),'Shortlisted','resumes/CG2027-012.pdf',NULL),
(31,12,10,DATE_SUB(CURRENT_TIMESTAMP,INTERVAL 5 DAY),'Applied','resumes/CG2027-012.pdf',NULL),
(32,13,2,DATE_SUB(CURRENT_TIMESTAMP,INTERVAL 11 DAY),'Under Review','resumes/CG2027-013.pdf',NULL),
(33,13,6,DATE_SUB(CURRENT_TIMESTAMP,INTERVAL 10 DAY),'Rejected','resumes/CG2027-013.pdf',NULL),
(34,13,11,DATE_SUB(CURRENT_TIMESTAMP,INTERVAL 9 DAY),'Applied','resumes/CG2027-013.pdf',NULL),
(35,14,3,DATE_SUB(CURRENT_TIMESTAMP,INTERVAL 8 DAY),'Shortlisted','resumes/CG2027-014.pdf',NULL),
(36,14,4,DATE_SUB(CURRENT_TIMESTAMP,INTERVAL 7 DAY),'Interview','resumes/CG2027-014.pdf',NULL),
(37,14,12,DATE_SUB(CURRENT_TIMESTAMP,INTERVAL 6 DAY),'Applied','resumes/CG2027-014.pdf',NULL),
(38,15,5,DATE_SUB(CURRENT_TIMESTAMP,INTERVAL 5 DAY),'Under Review','resumes/CG2027-015.pdf',NULL),
(39,15,8,DATE_SUB(CURRENT_TIMESTAMP,INTERVAL 4 DAY),'Rejected','resumes/CG2027-015.pdf',NULL),
(40,15,13,DATE_SUB(CURRENT_TIMESTAMP,INTERVAL 3 DAY),'Applied','resumes/CG2027-015.pdf',NULL),
(41,16,1,DATE_SUB(CURRENT_TIMESTAMP,INTERVAL 12 DAY),'Interview','resumes/CG2027-016.pdf',NULL),
(42,16,6,DATE_SUB(CURRENT_TIMESTAMP,INTERVAL 11 DAY),'Applied','resumes/CG2027-016.pdf',NULL),
(43,16,14,DATE_SUB(CURRENT_TIMESTAMP,INTERVAL 10 DAY),'Rejected','resumes/CG2027-016.pdf',NULL),
(44,17,2,DATE_SUB(CURRENT_TIMESTAMP,INTERVAL 9 DAY),'Shortlisted','resumes/CG2027-017.pdf',NULL),
(45,17,7,DATE_SUB(CURRENT_TIMESTAMP,INTERVAL 8 DAY),'Under Review','resumes/CG2027-017.pdf',NULL),
(46,17,15,DATE_SUB(CURRENT_TIMESTAMP,INTERVAL 7 DAY),'Applied','resumes/CG2027-017.pdf',NULL),
(47,18,3,DATE_SUB(CURRENT_TIMESTAMP,INTERVAL 6 DAY),'Rejected','resumes/CG2027-018.pdf',NULL),
(48,18,8,DATE_SUB(CURRENT_TIMESTAMP,INTERVAL 5 DAY),'Interview','resumes/CG2027-018.pdf',NULL),
(49,18,12,DATE_SUB(CURRENT_TIMESTAMP,INTERVAL 4 DAY),'Applied','resumes/CG2027-018.pdf',NULL),
(50,19,4,DATE_SUB(CURRENT_TIMESTAMP,INTERVAL 10 DAY),'Under Review','resumes/CG2027-019.pdf',NULL),
(51,19,9,DATE_SUB(CURRENT_TIMESTAMP,INTERVAL 9 DAY),'Shortlisted','resumes/CG2027-019.pdf',NULL),
(52,19,13,DATE_SUB(CURRENT_TIMESTAMP,INTERVAL 8 DAY),'Applied','resumes/CG2027-019.pdf',NULL),
(53,20,1,DATE_SUB(CURRENT_TIMESTAMP,INTERVAL 7 DAY),'Interview','resumes/CG2027-020.pdf',NULL),
(54,20,5,DATE_SUB(CURRENT_TIMESTAMP,INTERVAL 6 DAY),'Rejected','resumes/CG2027-020.pdf',NULL),
(55,20,10,DATE_SUB(CURRENT_TIMESTAMP,INTERVAL 5 DAY),'Applied','resumes/CG2027-020.pdf',NULL),
(56,21,2,DATE_SUB(CURRENT_TIMESTAMP,INTERVAL 12 DAY),'Shortlisted','resumes/CG2027-021.pdf',NULL),
(57,21,6,DATE_SUB(CURRENT_TIMESTAMP,INTERVAL 11 DAY),'Under Review','resumes/CG2027-021.pdf',NULL),
(58,21,11,DATE_SUB(CURRENT_TIMESTAMP,INTERVAL 10 DAY),'Applied','resumes/CG2027-021.pdf',NULL),
(59,22,3,DATE_SUB(CURRENT_TIMESTAMP,INTERVAL 9 DAY),'Interview','resumes/CG2027-022.pdf',NULL),
(60,22,7,DATE_SUB(CURRENT_TIMESTAMP,INTERVAL 8 DAY),'Rejected','resumes/CG2027-022.pdf',NULL),
(61,22,14,DATE_SUB(CURRENT_TIMESTAMP,INTERVAL 7 DAY),'Applied','resumes/CG2027-022.pdf',NULL),
(62,23,4,DATE_SUB(CURRENT_TIMESTAMP,INTERVAL 6 DAY),'Applied','resumes/CG2027-023.pdf',NULL),
(63,23,8,DATE_SUB(CURRENT_TIMESTAMP,INTERVAL 5 DAY),'Withdrawn','resumes/CG2027-023.pdf',NULL),
(64,23,15,DATE_SUB(CURRENT_TIMESTAMP,INTERVAL 4 DAY),'Rejected','resumes/CG2027-023.pdf',NULL),
(65,24,1,DATE_SUB(CURRENT_TIMESTAMP,INTERVAL 10 DAY),'Under Review','resumes/CG2027-024.pdf',NULL),
(66,24,9,DATE_SUB(CURRENT_TIMESTAMP,INTERVAL 9 DAY),'Interview','resumes/CG2027-024.pdf',NULL),
(67,24,12,DATE_SUB(CURRENT_TIMESTAMP,INTERVAL 8 DAY),'Applied','resumes/CG2027-024.pdf',NULL),
(68,25,5,DATE_SUB(CURRENT_TIMESTAMP,INTERVAL 7 DAY),'Shortlisted','resumes/CG2027-025.pdf',NULL),
(69,25,10,DATE_SUB(CURRENT_TIMESTAMP,INTERVAL 6 DAY),'Rejected','resumes/CG2027-025.pdf',NULL),
(70,25,13,DATE_SUB(CURRENT_TIMESTAMP,INTERVAL 5 DAY),'Applied','resumes/CG2027-025.pdf',NULL);

-- These status transitions invoke trg_application_selected_after_update.
UPDATE APPLICATION SET status = 'Selected' WHERE application_id BETWEEN 1 AND 10;

-- Ten offers; students 1-5 each have two offers to demonstrate offer history.
UPDATE PLACEMENT SET offer_date = DATE_SUB(CURRENT_DATE, INTERVAL 2 DAY), offered_compensation = 820000.00,
  placement_status = 'Accepted' WHERE application_id = 1;
UPDATE PLACEMENT SET offer_date = DATE_SUB(CURRENT_DATE, INTERVAL 1 DAY), offered_compensation = 900000.00,
  placement_status = 'Declined' WHERE application_id = 2;
UPDATE PLACEMENT SET offer_date = DATE_SUB(CURRENT_DATE, INTERVAL 3 DAY), offered_compensation = 760000.00,
  placement_status = 'Accepted' WHERE application_id = 3;
UPDATE PLACEMENT SET offer_date = DATE_SUB(CURRENT_DATE, INTERVAL 2 DAY), offered_compensation = 880000.00,
  placement_status = 'Declined' WHERE application_id = 4;
UPDATE PLACEMENT SET offer_date = DATE_SUB(CURRENT_DATE, INTERVAL 4 DAY), offered_compensation = 700000.00,
  placement_status = 'Offer Pending' WHERE application_id = 5;
UPDATE PLACEMENT SET offer_date = DATE_SUB(CURRENT_DATE, INTERVAL 2 DAY), offered_compensation = 740000.00,
  placement_status = 'Offer Pending' WHERE application_id = 6;
UPDATE PLACEMENT SET offer_date = DATE_SUB(CURRENT_DATE, INTERVAL 5 DAY), offered_compensation = 950000.00,
  placement_status = 'Joined', joining_date = DATE_ADD(CURRENT_DATE, INTERVAL 30 DAY) WHERE application_id = 7;
UPDATE PLACEMENT SET offer_date = DATE_SUB(CURRENT_DATE, INTERVAL 3 DAY), offered_compensation = 780000.00,
  placement_status = 'Withdrawn' WHERE application_id = 8;
UPDATE PLACEMENT SET offer_date = DATE_SUB(CURRENT_DATE, INTERVAL 2 DAY), offered_compensation = 680000.00,
  placement_status = 'Accepted' WHERE application_id = 9;
UPDATE PLACEMENT SET offer_date = DATE_SUB(CURRENT_DATE, INTERVAL 1 DAY), offered_compensation = 730000.00,
  placement_status = 'Declined' WHERE application_id = 10;

INSERT INTO INTERVIEW
  (interview_id, application_id, round_number, scheduled_at, mode, result, feedback) VALUES
(1,3,1,DATE_ADD(CURRENT_TIMESTAMP,INTERVAL 2 DAY),'Online',NULL,NULL),
(2,3,2,DATE_ADD(CURRENT_TIMESTAMP,INTERVAL 6 DAY),'In Person',NULL,NULL),
(3,4,1,DATE_ADD(CURRENT_TIMESTAMP,INTERVAL 3 DAY),'Online','Passed','Strong problem-solving.'),
(4,4,2,DATE_ADD(CURRENT_TIMESTAMP,INTERVAL 7 DAY),'Phone',NULL,NULL),
(5,7,1,DATE_SUB(CURRENT_TIMESTAMP,INTERVAL 1 DAY),'Online','Passed',NULL),
(6,7,2,DATE_ADD(CURRENT_TIMESTAMP,INTERVAL 1 DAY),'In Person',NULL,NULL),
(7,9,1,DATE_ADD(CURRENT_TIMESTAMP,INTERVAL 4 DAY),'Phone',NULL,NULL),
(8,9,2,DATE_ADD(CURRENT_TIMESTAMP,INTERVAL 8 DAY),'Online',NULL,NULL),
(9,12,1,DATE_ADD(CURRENT_TIMESTAMP,INTERVAL 2 DAY),'Online',NULL,NULL),
(10,12,2,DATE_ADD(CURRENT_TIMESTAMP,INTERVAL 5 DAY),'Phone',NULL,NULL),
(11,14,1,DATE_ADD(CURRENT_TIMESTAMP,INTERVAL 2 DAY),'In Person',NULL,NULL),
(12,17,1,DATE_SUB(CURRENT_TIMESTAMP,INTERVAL 1 DAY),'Online','Passed','Proceed to technical round.'),
(13,17,2,DATE_ADD(CURRENT_TIMESTAMP,INTERVAL 3 DAY),'Online',NULL,NULL),
(14,20,1,DATE_ADD(CURRENT_TIMESTAMP,INTERVAL 1 DAY),'Phone',NULL,NULL),
(15,23,1,DATE_ADD(CURRENT_TIMESTAMP,INTERVAL 3 DAY),'Online',NULL,NULL),
(16,23,2,DATE_ADD(CURRENT_TIMESTAMP,INTERVAL 6 DAY),'In Person',NULL,NULL),
(17,29,1,DATE_SUB(CURRENT_TIMESTAMP,INTERVAL 2 DAY),'Online','Passed',NULL),
(18,29,2,DATE_ADD(CURRENT_TIMESTAMP,INTERVAL 2 DAY),'Phone',NULL,NULL),
(19,30,1,DATE_ADD(CURRENT_TIMESTAMP,INTERVAL 5 DAY),'In Person',NULL,NULL),
(20,35,1,DATE_ADD(CURRENT_TIMESTAMP,INTERVAL 4 DAY),'Online',NULL,NULL),
(21,36,1,DATE_ADD(CURRENT_TIMESTAMP,INTERVAL 2 DAY),'Phone',NULL,NULL),
(22,36,2,DATE_ADD(CURRENT_TIMESTAMP,INTERVAL 6 DAY),'Online',NULL,NULL),
(23,41,1,DATE_SUB(CURRENT_TIMESTAMP,INTERVAL 1 DAY),'Online','Failed','Review SQL fundamentals.'),
(24,48,1,DATE_ADD(CURRENT_TIMESTAMP,INTERVAL 3 DAY),'In Person',NULL,NULL),
(25,48,2,DATE_ADD(CURRENT_TIMESTAMP,INTERVAL 7 DAY),'Phone',NULL,NULL),
(26,53,1,DATE_ADD(CURRENT_TIMESTAMP,INTERVAL 2 DAY),'Online',NULL,NULL),
(27,59,1,DATE_ADD(CURRENT_TIMESTAMP,INTERVAL 4 DAY),'Phone',NULL,NULL),
(28,59,2,DATE_ADD(CURRENT_TIMESTAMP,INTERVAL 8 DAY),'Online',NULL,NULL),
(29,66,1,DATE_ADD(CURRENT_TIMESTAMP,INTERVAL 3 DAY),'In Person',NULL,NULL),
(30,66,2,DATE_ADD(CURRENT_TIMESTAMP,INTERVAL 7 DAY),'Online',NULL,NULL);

-- Eighty-five student-skill records across departments and proficiency levels.
INSERT INTO STUDENT_SKILL (student_id, skill_id, proficiency_level, acquired_on) VALUES
(1,1,'Advanced','2024-06-01'),(1,4,'Advanced','2024-08-12'),(1,8,'Intermediate','2025-01-10'),(1,14,'Intermediate','2024-09-03'),
(2,2,'Advanced','2024-05-12'),(2,4,'Intermediate','2024-08-08'),(2,7,'Intermediate','2025-02-15'),(2,13,'Advanced','2024-04-04'),
(3,3,'Intermediate','2024-07-20'),(3,10,'Advanced','2024-09-14'),(3,11,'Intermediate','2025-01-18'),(3,13,'Intermediate','2024-11-01'),
(4,1,'Intermediate','2024-06-21'),(4,5,'Intermediate','2024-10-12'),(4,6,'Advanced','2024-05-17'),(4,15,'Advanced','2024-09-22'),
(5,1,'Advanced','2024-03-18'),(5,2,'Intermediate','2024-05-25'),(5,4,'Advanced','2024-07-19'),(5,14,'Advanced','2024-08-11'),
(6,6,'Intermediate','2024-06-02'),(6,10,'Intermediate','2024-10-29'),(6,13,'Advanced','2024-04-20'),(6,15,'Intermediate','2025-01-12'),
(7,1,'Advanced','2024-02-14'),(7,3,'Intermediate','2024-05-30'),(7,4,'Advanced','2024-08-05'),(7,9,'Intermediate','2025-02-02'),
(8,2,'Intermediate','2024-05-07'),(8,6,'Advanced','2024-07-23'),(8,7,'Intermediate','2025-01-28'),(8,13,'Advanced','2024-04-15'),
(9,3,'Advanced','2024-03-29'),(9,10,'Intermediate','2024-09-09'),(9,11,'Advanced','2024-08-22'),(9,14,'Beginner','2025-02-17'),
(10,1,'Advanced','2024-02-03'),(10,4,'Advanced','2024-05-16'),(10,5,'Intermediate','2024-07-25'),(10,8,'Advanced','2025-01-06'),
(11,1,'Intermediate','2024-06-18'),(11,4,'Beginner','2024-11-08'),(11,7,'Intermediate','2025-02-20'),
(12,3,'Intermediate','2024-07-11'),(12,8,'Advanced','2024-10-02'),(12,13,'Advanced','2024-04-28'),
(13,1,'Intermediate','2024-05-03'),(13,2,'Beginner','2024-08-19'),(13,4,'Intermediate','2024-09-26'),
(14,2,'Advanced','2024-03-16'),(14,4,'Intermediate','2024-06-12'),(14,12,'Intermediate','2024-11-05'),
(15,3,'Intermediate','2024-07-03'),(15,10,'Beginner','2024-10-20'),(15,11,'Intermediate','2025-01-30'),
(16,5,'Intermediate','2024-08-03'),(16,6,'Advanced','2024-05-25'),(16,7,'Intermediate','2025-02-05'),
(17,1,'Advanced','2024-02-22'),(17,4,'Intermediate','2024-06-09'),(17,14,'Advanced','2024-08-24'),
(18,6,'Intermediate','2024-07-05'),(18,8,'Beginner','2024-11-17'),(18,13,'Advanced','2024-03-13'),
(19,1,'Advanced','2024-01-29'),(19,3,'Advanced','2024-04-08'),(19,9,'Advanced','2024-09-30'),
(20,2,'Intermediate','2024-04-16'),(20,4,'Advanced','2024-07-27'),(20,5,'Intermediate','2024-09-07'),
(21,3,'Intermediate','2024-06-27'),(21,10,'Advanced','2024-10-11'),(21,11,'Intermediate','2025-01-22'),
(22,1,'Intermediate','2024-05-10'),(22,4,'Advanced','2024-08-02'),(22,15,'Advanced','2024-09-15'),
(23,1,'Beginner','2024-09-13'),(23,6,'Intermediate','2024-10-01'),(23,13,'Intermediate','2025-02-01'),
(24,2,'Intermediate','2024-05-21'),(24,4,'Intermediate','2024-07-17'),(24,8,'Advanced','2024-11-22'),
(25,1,'Advanced','2024-02-28'),(25,4,'Intermediate','2024-06-14'),(25,14,'Intermediate','2024-08-27');

-- Sanity-check result sets for the eventual student viva/demo.
SELECT COUNT(*) AS student_count FROM STUDENT;
SELECT COUNT(*) AS application_count FROM APPLICATION;
SELECT COUNT(*) AS offer_count FROM PLACEMENT;
SELECT COUNT(*) AS student_skill_count FROM STUDENT_SKILL;
