/**
 * Représente une notification retournée par l'API Django.
 */
export interface Notification {
  idNotification: number;
  idUtilisateur: number;
  titre: string;
  message: string;
  dateEnvoi: string;
  lu: boolean;
}
