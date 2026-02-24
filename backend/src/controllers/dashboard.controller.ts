import { Response } from 'express';
import { pool } from '../database/connection';
import { AuthRequest } from '../middleware/auth.middleware';

export const getStatistics = async (req: AuthRequest, res: Response) => {
  try {
    // Statistiques globales
    const totalResult = await pool.query(
      'SELECT COUNT(*) as total FROM applications WHERE user_id = $1',
      [req.userId]
    );

    const statusResult = await pool.query(
      `SELECT status, COUNT(*) as count 
       FROM applications 
       WHERE user_id = $1 
       GROUP BY status`,
      [req.userId]
    );

    // Statistiques par mois
    const monthlyResult = await pool.query(
      `SELECT 
         DATE_TRUNC('month', application_date) as month,
         COUNT(*) as count
       FROM applications
       WHERE user_id = $1 AND application_date IS NOT NULL
       GROUP BY month
       ORDER BY month DESC
       LIMIT 12`,
      [req.userId]
    );

    // Taux de réponse
    const responseRateResult = await pool.query(
      `SELECT 
         COUNT(*) FILTER (WHERE response_date IS NOT NULL) as responded,
         COUNT(*) as total
       FROM applications
       WHERE user_id = $1`,
      [req.userId]
    );

    const total = parseInt(totalResult.rows[0]?.total || '0');
    const responded = parseInt(responseRateResult.rows[0]?.responded || '0');
    const responseRate = total > 0 ? (responded / total) * 100 : 0;

    // Répartition par statut
    const statusDistribution: any = {};
    statusResult.rows.forEach((row: any) => {
      statusDistribution[row.status] = parseInt(row.count);
    });

    res.json({
      total,
      statusDistribution,
      monthlyData: monthlyResult.rows.map((row: any) => ({
        month: row.month,
        count: parseInt(row.count)
      })),
      responseRate: Math.round(responseRate * 100) / 100,
      responded,
      pending: statusDistribution.pending || 0,
      interview: statusDistribution.interview || 0,
      accepted: statusDistribution.accepted || 0,
      rejected: statusDistribution.rejected || 0
    });
  } catch (error: any) {
    console.error('Erreur lors de la récupération des statistiques:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

export const getRecentApplications = async (req: AuthRequest, res: Response) => {
  try {
    const { limit = 5 } = req.query;

    const result = await pool.query(
      `SELECT * FROM applications 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2`,
      [req.userId, limit]
    );

    res.json(result.rows.map(row => ({
      id: row.id,
      companyName: row.company_name,
      position: row.position,
      status: row.status,
      applicationDate: row.application_date,
      createdAt: row.created_at
    })));
  } catch (error: any) {
    console.error('Erreur lors de la récupération des candidatures récentes:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

