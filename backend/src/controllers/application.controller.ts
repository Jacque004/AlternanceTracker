import { Response } from 'express';
import { pool } from '../database/connection';
import { AuthRequest } from '../middleware/auth.middleware';

export const getAllApplications = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, sortBy = 'created_at', order = 'DESC' } = req.query;

    let query = 'SELECT * FROM applications WHERE user_id = $1';
    const params: any[] = [req.userId];

    if (status) {
      query += ' AND status = $2';
      params.push(status);
    }

    query += ` ORDER BY ${sortBy} ${order}`;

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
    console.error('Erreur lors de la récupération des candidatures:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
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
    console.error('Erreur lors de la récupération de la candidature:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

export const createApplication = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
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
    console.error('Erreur lors de la création de la candidature:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
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
    console.error('Erreur lors de la mise à jour de la candidature:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
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
    console.error('Erreur lors de la suppression de la candidature:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

