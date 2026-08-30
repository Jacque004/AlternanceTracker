import { Response } from 'express';
import format from 'pg-format';
import { pool } from '../database/connection';
import { AuthRequest } from '../middleware/auth.middleware';
import { sendErrorResponse, SafeErrorMessages, ErrorCategories } from '../utils/errorHandler';

export const getAllApplications = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, sortBy = 'created_at', order = 'DESC' } = req.query;

    // Whitelist stricte des colonnes autorisées avec mapping TypeScript
    const ALLOWED_SORT_COLUMNS: Record<string, string> = {
      'created_at': 'created_at',
      'updated_at': 'updated_at',
      'application_date': 'application_date',
      'response_date': 'response_date',
      'company_name': 'company_name',
      'position': 'position',
      'status': 'status',
    };

    const sortByParam = String(sortBy);
    const safeSortBy = ALLOWED_SORT_COLUMNS[sortByParam] || 'created_at';
    const normalizedOrder = String(order).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    let query = 'SELECT * FROM applications WHERE user_id = $1';
    const params: any[] = [req.userId];

    if (status) {
      query += ' AND status = $2';
      params.push(status);
    }

    // Utiliser pg-format pour sécuriser l'injection de la clause ORDER BY
    // %I = identifiant (nom de colonne), %s = string littéral
    const orderClause = format(' ORDER BY %I %s', safeSortBy, normalizedOrder);
    query += orderClause;

    const result = await pool.query(query, params);
    res.json(result.rows.map(row => ({
      id: row.id,
      companyName: row.company_name,
      position: row.position,
      status: row.status,
      applicationDate: row.application_date,
      responseDate: row.response_date,
      notes: row.notes,
      location: row.location,
      salaryRange: row.salary_range,
      jobUrl: row.job_url,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    })));
  } catch (error: any) {
    sendErrorResponse(res, 500, SafeErrorMessages.DATABASE_ERROR, error, ErrorCategories.DATABASE);
  }
};

export const getApplicationById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT * FROM applications WHERE id = $1 AND user_id = $2',
      [id, req.userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ message: 'Candidature non trouvée' });
      return;
    }

    const row = result.rows[0];
    res.json({
      id: row.id,
      companyName: row.company_name,
      position: row.position,
      status: row.status,
      applicationDate: row.application_date,
      responseDate: row.response_date,
      notes: row.notes,
      location: row.location,
      salaryRange: row.salary_range,
      jobUrl: row.job_url,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    });
  } catch (error: any) {
    sendErrorResponse(res, 500, SafeErrorMessages.DATABASE_ERROR, error, ErrorCategories.DATABASE);
  }
};

export const createApplication = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Vérifier le nombre de candidatures existantes pour éviter les abus
    const MAX_APPLICATIONS_PER_USER = 1000;

    const countResult = await pool.query(
      'SELECT COUNT(*) as count FROM applications WHERE user_id = $1',
      [req.userId]
    );

    const currentCount = parseInt(countResult.rows[0]?.count || '0', 10);

    if (currentCount >= MAX_APPLICATIONS_PER_USER) {
      res.status(403).json({
        message: `Limite de ${MAX_APPLICATIONS_PER_USER} candidatures atteinte. Supprimez des anciennes candidatures pour en créer de nouvelles.`
      });
      return;
    }

    const {
      companyName,
      position,
      status = 'pending',
      applicationDate,
      responseDate,
      notes,
      location,
      salaryRange,
      jobUrl
    } = req.body;

    const result = await pool.query(
      `INSERT INTO applications 
       (user_id, company_name, position, status, application_date, response_date, notes, location, salary_range, job_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [req.userId, companyName, position, status, applicationDate, responseDate, notes, location, salaryRange, jobUrl]
    );

    const row = result.rows[0];
    res.status(201).json({
      message: 'Candidature créée avec succès',
      application: {
        id: row.id,
        companyName: row.company_name,
        position: row.position,
        status: row.status,
        applicationDate: row.application_date,
        responseDate: row.response_date,
        notes: row.notes,
        location: row.location,
        salaryRange: row.salary_range,
        jobUrl: row.job_url,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }
    });
  } catch (error: any) {
    sendErrorResponse(res, 500, 'Erreur lors de la création de la candidature.', error, ErrorCategories.DATABASE);
  }
};

export const updateApplication = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      companyName,
      position,
      status,
      applicationDate,
      responseDate,
      notes,
      location,
      salaryRange,
      jobUrl
    } = req.body;

    // Vérifier que la candidature appartient à l'utilisateur
    const checkResult = await pool.query(
      'SELECT id FROM applications WHERE id = $1 AND user_id = $2',
      [id, req.userId]
    );

    if (checkResult.rows.length === 0) {
      res.status(404).json({ message: 'Candidature non trouvée' });
      return;
    }

    const result = await pool.query(
      `UPDATE applications SET
       company_name = COALESCE($1, company_name),
       position = COALESCE($2, position),
       status = COALESCE($3, status),
       application_date = COALESCE($4, application_date),
       response_date = COALESCE($5, response_date),
       notes = COALESCE($6, notes),
       location = COALESCE($7, location),
       salary_range = COALESCE($8, salary_range),
       job_url = COALESCE($9, job_url),
       updated_at = CURRENT_TIMESTAMP
       WHERE id = $10 AND user_id = $11
       RETURNING *`,
      [companyName, position, status, applicationDate, responseDate, notes, location, salaryRange, jobUrl, id, req.userId]
    );

    const row = result.rows[0];
    res.json({
      message: 'Candidature mise à jour avec succès',
      application: {
        id: row.id,
        companyName: row.company_name,
        position: row.position,
        status: row.status,
        applicationDate: row.application_date,
        responseDate: row.response_date,
        notes: row.notes,
        location: row.location,
        salaryRange: row.salary_range,
        jobUrl: row.job_url,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }
    });
  } catch (error: any) {
    sendErrorResponse(res, 500, 'Erreur lors de la mise à jour de la candidature.', error, ErrorCategories.DATABASE);
  }
};

export const deleteApplication = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM applications WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, req.userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ message: 'Candidature non trouvée' });
      return;
    }

    res.json({ message: 'Candidature supprimée avec succès' });
  } catch (error: any) {
    sendErrorResponse(res, 500, 'Erreur lors de la suppression de la candidature.', error, ErrorCategories.DATABASE);
  }
};

