export type RootStackParamList = {
  Auth: undefined;
  App: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  OTP: {
    phoneOrEmail: string;
  };
};

export type ParentTabParamList = {
  Accueil: undefined;
  Messages: undefined;
  Assistant: undefined;
  Profil: undefined;
};