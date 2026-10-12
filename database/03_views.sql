-- CareerGrid reusable reporting/application views.
USE CareerGrid;

CREATE OR REPLACE VIEW student_application_tracking AS
SELECT
  s.student_id,
  s.full_name AS student_name,
  a.application_id,
  o.opportunity_id,
  o.title AS opportunity_title,
  o.opportunity_type,
  c.company_id,
  c.company_name,
  a.status AS application_status,
  a.applied_at,
  o.deadline
FROM STUDENT AS s
JOIN APPLICATION AS a ON a.student_id = s.student_id
JOIN OPPORTUNITY AS o ON o.opportunity_id = a.opportunity_id
JOIN COMPANY AS c ON c.company_id = o.company_id;

CREATE OR REPLACE VIEW active_opportunities AS
SELECT
  o.opportunity_id,
  o.title,
  o.opportunity_type,
  o.description,
  o.location,
  o.stipend,
  o.salary,
  o.minimum_cgpa,
  o.open_date,
  o.deadline,
  c.company_id,
  c.company_name
FROM OPPORTUNITY AS o
JOIN COMPANY AS c ON c.company_id = o.company_id
WHERE o.status = 'Open'
  AND CURRENT_TIMESTAMP BETWEEN o.open_date AND o.deadline;

CREATE OR REPLACE VIEW placement_statistics AS
SELECT
  c.company_id,
  c.company_name,
  o.opportunity_type,
  COUNT(p.placement_id) AS offer_count,
  AVG(p.offered_compensation) AS average_compensation,
  MAX(p.offered_compensation) AS maximum_compensation,
  MIN(p.offered_compensation) AS minimum_compensation
FROM PLACEMENT AS p
JOIN APPLICATION AS a ON a.application_id = p.application_id
JOIN OPPORTUNITY AS o ON o.opportunity_id = a.opportunity_id
JOIN COMPANY AS c ON c.company_id = o.company_id
GROUP BY c.company_id, c.company_name, o.opportunity_type;
