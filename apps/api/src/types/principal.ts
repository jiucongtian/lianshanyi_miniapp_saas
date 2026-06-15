export interface Principal {
  callerType: 'user' | 'service';
  contextId: string;
  subjectUserId?: string;
  scopes: string[];
}
