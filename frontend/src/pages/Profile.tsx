import { useEffect, useState, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useSupabaseAuth } from '../contexts/SupabaseAuthContext';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { userFacingErrorMessage } from '../utils/errorMessage';
import { rgpdService } from '../services/supabaseService';
import { formatDateForInput, formatDisplayDate, formatLocalDateIso } from '../utils/dateDisplay';

const AVATAR_BUCKET = 'avatars';
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const AVATAR_MIME = ['image/jpeg', 'image/png', 'image/webp'] as const;

const inputClass =
  'mt-1.5 block w-full rounded-xl border-gray-200 bg-white py-2.5 px-3.5 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 transition-shadow focus:border-primary-500 focus:ring-2 focus:ring-primary-500/15 disabled:bg-gray-50 disabled:text-gray-500';

const labelClass = 'block text-sm font-medium text-gray-700';

function avatarStoragePath(userId: string) {
  return `${userId}/avatar`;
}

function profileInitials(firstName: string, lastName: string) {
  const a = firstName.trim().charAt(0).toUpperCase();
  const b = lastName.trim().charAt(0).toUpperCase();
  return (a + b) || '?';
}

function ProfileSection({
  id,
  title,
  description,
  children,
}: {
  id?: string;
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="rounded-2xl border border-gray-200/90 bg-white shadow-card overflow-hidden scroll-mt-24"
    >
      <div className="border-b border-gray-100 bg-gradient-to-r from-slate-50/90 via-white to-sky-50/20 px-5 py-4 sm:px-6">
        <h2 className="text-base font-semibold tracking-tight text-gray-900">{title}</h2>
        {description ? <p className="mt-1 text-sm text-gray-500 leading-relaxed max-w-2xl">{description}</p> : null}
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </section>
  );
}

const Profile = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, session, updateProfile, signOut } = useSupabaseAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarRev, setAvatarRev] = useState(0);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    school: '',
    formation: '',
    studyYear: '',
    alternanceRhythm: '',
    desiredStartDate: '',
    linkedinUrl: '',
    weeklySummaryEnabled: false,
    reminderEmailsEnabled: true,
    inAppNotificationsEnabled: true,
    applicationsGoal: '' as string | number,
  });

  useEffect(() => {
    if (location.hash === '#notifications') {
      document.getElementById('notifications')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [location.hash]);

  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        school: user.school || '',
        formation: user.formation || '',
        studyYear: user.studyYear || '',
        alternanceRhythm: user.alternanceRhythm || '',
        desiredStartDate: formatDateForInput(user.desiredStartDate) || '',
        linkedinUrl: user.linkedinUrl || '',
        weeklySummaryEnabled: user.weeklySummaryEnabled ?? false,
        reminderEmailsEnabled: user.reminderEmailsEnabled ?? true,
        inAppNotificationsEnabled: user.inAppNotificationsEnabled ?? true,
        applicationsGoal: user.applicationsGoal != null ? user.applicationsGoal : '',
      });
    }
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleAvatarPick = () => fileInputRef.current?.click();

  const handleAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !session?.user?.id) return;
    if (!AVATAR_MIME.includes(file.type as (typeof AVATAR_MIME)[number])) {
      toast.error('Formats acceptés : JPEG, PNG ou WebP.');
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      toast.error('Image trop volumineuse (maximum 2 Mo).');
      return;
    }
    const path = avatarStoragePath(session.user.id);
    setAvatarUploading(true);
    try {
      const { error: uploadError } = await supabase.storage.from(AVATAR_BUCKET).upload(path, file, {
        upsert: true,
        contentType: file.type,
        cacheControl: '3600',
      });
      if (uploadError) throw uploadError;
      const { data: pub } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
      const { error } = await updateProfile({ avatarUrl: pub.publicUrl });
      if (error) throw error;
      setAvatarRev((n) => n + 1);
      toast.success('Photo mise à jour');
    } catch (err: unknown) {
      toast.error(userFacingErrorMessage(err, 'Envoi de la photo impossible.'));
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleAvatarRemove = async () => {
    if (!session?.user?.id) return;
    setAvatarUploading(true);
    try {
      const { error } = await updateProfile({ avatarUrl: null });
      if (error) throw error;
      await supabase.storage.from(AVATAR_BUCKET).remove([avatarStoragePath(session.user.id)]);
      setAvatarRev((n) => n + 1);
      toast.success('Photo supprimée');
    } catch (err: unknown) {
      toast.error(userFacingErrorMessage(err, 'Impossible de supprimer la photo.'));
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await updateProfile({
        firstName: formData.firstName,
        lastName: formData.lastName,
        school: formData.school || undefined,
        formation: formData.formation || undefined,
        studyYear: formData.studyYear || undefined,
        alternanceRhythm: formData.alternanceRhythm || undefined,
        desiredStartDate: formData.desiredStartDate || undefined,
        linkedinUrl: formData.linkedinUrl || undefined,
        weeklySummaryEnabled: formData.weeklySummaryEnabled,
        reminderEmailsEnabled: formData.reminderEmailsEnabled,
        inAppNotificationsEnabled: formData.inAppNotificationsEnabled,
        applicationsGoal:
          formData.applicationsGoal === ''
            ? null
            : typeof formData.applicationsGoal === 'number'
              ? formData.applicationsGoal
              : parseInt(String(formData.applicationsGoal), 10) || null,
      });
      if (error) {
        toast.error(userFacingErrorMessage(error, 'Impossible d’enregistrer le profil.'));
      } else {
        toast.success('Modifications enregistrées');
      }
    } catch (err: unknown) {
      toast.error(userFacingErrorMessage(err, 'Impossible d’enregistrer le profil.'));
    } finally {
      setLoading(false);
    }
  };

  const avatarDisplaySrc =
    user?.avatarUrl && user.avatarUrl.trim() !== ''
      ? `${user.avatarUrl}${/\?/.test(user.avatarUrl) ? '&' : '?'}rev=${avatarRev}`
      : null;

  const displayName =
    `${formData.firstName} ${formData.lastName}`.trim() || 'Mon espace';

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto stack-page pb-4" role="status" aria-live="polite">
        <div className="h-32 rounded-2xl bg-gray-100 animate-pulse" />
        <div className="mt-6 h-64 rounded-2xl bg-gray-100 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto stack-page page-shell pb-4">
      <header className="relative overflow-hidden rounded-2xl border border-primary-100 bg-gradient-to-br from-primary-600 via-sky-600 to-sky-700 px-4 sm:px-6 py-6 sm:py-8 text-white shadow-lg shadow-primary-900/10">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10 blur-2xl" aria-hidden />
        <div className="pointer-events-none absolute -bottom-20 -left-10 h-40 w-40 rounded-full bg-sky-400/20 blur-2xl" aria-hidden />
        <p className="relative text-sm font-medium text-sky-100">Paramètres du compte</p>
        <h1 className="relative mt-1 text-2xl sm:text-3xl font-bold tracking-tight">{displayName}</h1>
        <p className="relative mt-2 max-w-lg text-sm text-sky-100/95 leading-relaxed">
          Personnalisez vos informations et préférences. Les modifications sont enregistrées lorsque vous cliquez sur « Enregistrer ».
        </p>
        <div className="relative mt-4 flex flex-wrap items-center gap-2">
          {user?.createdAt ? (
            <span className="inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
              Membre depuis le {formatDisplayDate(user.createdAt)}
            </span>
          ) : null}
          {user?.isAdmin ? (
            <Link
              to="/admin"
              className="inline-flex items-center rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-primary-700 shadow-sm hover:bg-sky-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary-600"
            >
              Panel admin
            </Link>
          ) : null}
        </div>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6">
        <ProfileSection
          title="Photo & identité"
          description="Votre photo est visible dans Mon espace. Les champs ci-dessous servent à personnaliser vos documents et le tableau de bord."
        >
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-8">
            <div className="relative shrink-0">
              <div className="rounded-full p-1 ring-2 ring-primary-100 ring-offset-2 ring-offset-white shadow-md">
                {avatarDisplaySrc ? (
                  <img
                    src={avatarDisplaySrc}
                    alt="Ma photo"
                    className="h-32 w-32 rounded-full object-cover bg-gray-100"
                    decoding="async"
                  />
                ) : (
                  <div
                    className="flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-primary-100 to-sky-100 text-3xl font-bold text-primary-800"
                    aria-hidden
                  >
                    {profileInitials(formData.firstName, formData.lastName)}
                  </div>
                )}
              </div>
              {avatarUploading && (
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-white/80 backdrop-blur-sm">
                  <span className="text-xs font-semibold text-gray-700">Envoi…</span>
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0 w-full space-y-5">
              <div>
                <p className="text-sm font-medium text-gray-900">Photo</p>
                <p className="mt-1 text-sm text-gray-500">JPEG, PNG ou WebP — maximum 2&nbsp;Mo.</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  aria-label="Choisir une photo"
                  onChange={(ev) => void handleAvatarFile(ev)}
                />
                <div className="mt-4 flex flex-wrap gap-2 justify-center sm:justify-start">
                  <button
                    type="button"
                    onClick={handleAvatarPick}
                    disabled={avatarUploading}
                    className="inline-flex items-center justify-center rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700 disabled:opacity-50 min-h-[44px]"
                  >
                    {user?.avatarUrl ? 'Changer la photo' : 'Ajouter une photo'}
                  </button>
                  {user?.avatarUrl ? (
                    <button
                      type="button"
                      onClick={() => void handleAvatarRemove()}
                      disabled={avatarUploading}
                      className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-50 min-h-[44px]"
                    >
                      Supprimer
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="firstName" className={labelClass}>
                    Prénom
                  </label>
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="lastName" className={labelClass}>
                    Nom
                  </label>
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    className={inputClass}
                  />
                </div>
              </div>
            </div>
          </div>
        </ProfileSection>

        <ProfileSection title="Adresse e-mail" description="Utilisée pour la connexion et les notifications. Elle ne peut pas être modifiée depuis cette page.">
          <div className="relative">
            <label htmlFor="email" className={labelClass}>
              Email
            </label>
            <div className="relative mt-1.5">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden>
                ✉️
              </span>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                disabled
                className={`${inputClass} pl-10`}
              />
            </div>
          </div>
        </ProfileSection>

        <ProfileSection
          title="Parcours & alternance"
          description="Ces informations nous aident à adapter les conseils (CV, lettres, objectifs)."
        >
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="school" className={labelClass}>
                École / établissement
              </label>
              <input
                type="text"
                id="school"
                name="school"
                value={formData.school}
                onChange={handleChange}
                className={inputClass}
                placeholder="Ex. Université Paris-Saclay"
              />
            </div>
            <div>
              <label htmlFor="formation" className={labelClass}>
                Formation
              </label>
              <input
                type="text"
                id="formation"
                name="formation"
                value={formData.formation}
                onChange={handleChange}
                className={inputClass}
                placeholder="Ex. Master Informatique"
              />
            </div>
            <div>
              <label htmlFor="studyYear" className={labelClass}>
                Année
              </label>
              <input
                type="text"
                id="studyYear"
                name="studyYear"
                value={formData.studyYear}
                onChange={handleChange}
                className={inputClass}
                placeholder="Ex. L2, M1"
              />
            </div>
            <div>
              <label htmlFor="alternanceRhythm" className={labelClass}>
                Rythme d&apos;alternance
              </label>
              <input
                type="text"
                id="alternanceRhythm"
                name="alternanceRhythm"
                value={formData.alternanceRhythm}
                onChange={handleChange}
                className={inputClass}
                placeholder="Ex. 2j école / 3j entreprise"
              />
            </div>
            <div>
              <label htmlFor="desiredStartDate" className={labelClass}>
                Date de début recherchée
              </label>
              <input
                type="date"
                id="desiredStartDate"
                name="desiredStartDate"
                value={formData.desiredStartDate}
                onChange={handleChange}
                className={inputClass}
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="linkedinUrl" className={labelClass}>
                LinkedIn
              </label>
              <input
                type="url"
                id="linkedinUrl"
                name="linkedinUrl"
                value={formData.linkedinUrl}
                onChange={handleChange}
                className={inputClass}
                placeholder="https://linkedin.com/in/…"
              />
            </div>
            <div className="sm:col-span-2 rounded-xl border border-sky-100 bg-sky-50/40 p-4">
              <label htmlFor="applicationsGoal" className={labelClass}>
                Objectif candidatures par semaine
              </label>
              <input
                type="number"
                id="applicationsGoal"
                name="applicationsGoal"
                min={0}
                value={formData.applicationsGoal}
                onChange={handleChange}
                className={inputClass}
                placeholder="Ex. 5"
              />
              <p className="mt-2 text-xs text-gray-600">Affiché sur le tableau de bord. Mettez 0 pour masquer le bloc objectif.</p>
            </div>
          </div>
        </ProfileSection>

        <ProfileSection id="notifications" title="Notifications">
          <div className="space-y-3">
            {!formData.inAppNotificationsEnabled ? (
              <p className="text-sm text-gray-600 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                La cloche est masquée tant que les notifications in-app sont désactivées.
              </p>
            ) : null}
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-primary-200/80 bg-primary-50/30 p-4 transition hover:border-primary-300 hover:bg-primary-50/40 focus-within:ring-2 focus-within:ring-primary-500/25">
              <input
                type="checkbox"
                name="inAppNotificationsEnabled"
                checked={formData.inAppNotificationsEnabled ?? false}
                onChange={handleChange}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm leading-snug text-gray-800">
                <span className="font-medium text-gray-900">Notifications dans l’application</span>
                <span className="mt-0.5 block text-gray-500">
                  Cloche dans la barre de navigation : bienvenue, candidature enregistrée, rappel de suivi hebdomadaire.
                </span>
              </span>
            </label>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide px-1 pt-2">
              Par e-mail
            </p>
            <p className="text-xs text-gray-500 px-1 -mt-1">
              Les rappels et le résumé hebdomadaire nécessitent une configuration Resend + cron côté
              hébergement.
            </p>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 bg-gray-50/30 p-4 transition hover:border-primary-200 hover:bg-primary-50/20 focus-within:ring-2 focus-within:ring-primary-500/25">
              <input
                type="checkbox"
                name="reminderEmailsEnabled"
                checked={formData.reminderEmailsEnabled ?? true}
                onChange={handleChange}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm leading-snug text-gray-800">
                <span className="font-medium text-gray-900">Rappels relances & entretiens</span>
                <span className="mt-0.5 block text-gray-500">Emails lorsque des actions sont à prévoir.</span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 bg-gray-50/30 p-4 transition hover:border-primary-200 hover:bg-primary-50/20 focus-within:ring-2 focus-within:ring-primary-500/25">
              <input
                type="checkbox"
                name="weeklySummaryEnabled"
                checked={formData.weeklySummaryEnabled ?? false}
                onChange={handleChange}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm leading-snug text-gray-800">
                <span className="font-medium text-gray-900">Résumé hebdomadaire</span>
                <span className="mt-0.5 block text-gray-500">Vue d’ensemble de votre activité sur la semaine.</span>
              </span>
            </label>
          </div>
        </ProfileSection>

        <ProfileSection
          title="Données personnelles (RGPD)"
          description="Exportez une copie de vos données ou demandez la suppression définitive du compte."
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap">
            <button
              type="button"
              disabled={exporting}
              onClick={async () => {
                setExporting(true);
                try {
                  const data = await rgpdService.exportMyData();
                  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `alternance-tracker-export-${formatLocalDateIso()}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                  toast.success('Export téléchargé');
                } catch (e: unknown) {
                  toast.error(userFacingErrorMessage(e, 'Impossible d’exporter vos données.'));
                } finally {
                  setExporting(false);
                }
              }}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-800 shadow-sm transition hover:bg-gray-50 disabled:opacity-50 sm:flex-none sm:min-w-[200px]"
            >
              <span aria-hidden>📥</span>
              {exporting ? 'Export…' : 'Télécharger mes données'}
            </button>
            <button
              type="button"
              onClick={() => setDeleteConfirmOpen(true)}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800 shadow-sm transition hover:bg-red-100 sm:flex-none sm:min-w-[200px]"
            >
              <span aria-hidden>🗑️</span>
              Supprimer mon compte
            </button>
          </div>
          {user?.privacyPolicyAcceptedAt ? (
            <p className="mt-5 text-xs text-gray-500 leading-relaxed border-t border-gray-100 pt-4">
              Politique de confidentialité acceptée le {formatDisplayDate(user.privacyPolicyAcceptedAt)}
              {user?.termsAcceptedAt ? ` · CGU acceptées le ${formatDisplayDate(user.termsAcceptedAt)}` : ''}.
            </p>
          ) : null}
        </ProfileSection>

        <ProfileSection title="Session">
          <p className="text-sm text-gray-600 mb-4">
            Fermez votre session sur cet appareil. Vous pourrez vous reconnecter à tout moment.
          </p>
          <button
            type="button"
            onClick={() => void signOut()}
            className="inline-flex w-full sm:w-auto items-center justify-center rounded-xl border border-red-200 bg-white px-5 py-3 text-sm font-semibold text-red-700 shadow-sm transition hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/30 min-h-[48px]"
          >
            Déconnexion
          </button>
        </ProfileSection>

        <div className="sticky bottom-3 z-10 flex flex-col-reverse gap-3 rounded-2xl border border-gray-200/90 bg-white/95 p-3 sm:p-4 shadow-lg backdrop-blur-md sm:flex-row sm:items-center sm:justify-between max-w-full box-border">
          <p className="text-center text-xs text-gray-500 sm:text-left">Pensez à enregistrer après vos modifications.</p>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full items-center justify-center rounded-xl bg-primary-600 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-primary-600/20 transition hover:bg-primary-700 disabled:opacity-50 sm:w-auto min-h-[48px]"
          >
            {loading ? 'Enregistrement…' : 'Enregistrer les modifications'}
          </button>
        </div>

        {deleteConfirmOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 p-4 backdrop-blur-[2px]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-title"
          >
            <div className="w-full max-w-md overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl">
              <div className="border-b border-red-50 bg-red-50/80 px-6 py-4">
                <h3 id="delete-title" className="text-lg font-semibold text-red-950">
                  Supprimer mon compte
                </h3>
              </div>
              <div className="px-6 py-5">
                <p className="text-sm leading-relaxed text-gray-600">
                  Cette action est <strong className="text-gray-900">irréversible</strong>. Toutes vos données (compte,
                  candidatures, CV, lettres) seront définitivement supprimées.
                </p>
                <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmOpen(false)}
                    disabled={deleting}
                    className="rounded-xl px-4 py-2.5 text-sm font-medium text-gray-700 ring-1 ring-gray-200 transition hover:bg-gray-50 disabled:opacity-50"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      setDeleting(true);
                      try {
                        await rgpdService.deleteMyAccount();
                        await signOut();
                        toast.success('Compte supprimé');
                        navigate('/');
                      } catch (e: unknown) {
                        toast.error(userFacingErrorMessage(e, 'Impossible de supprimer le compte.'));
                      } finally {
                        setDeleting(false);
                        setDeleteConfirmOpen(false);
                      }
                    }}
                    disabled={deleting}
                    className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:opacity-50"
                  >
                    {deleting ? 'Suppression…' : 'Confirmer la suppression'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};

export default Profile;
