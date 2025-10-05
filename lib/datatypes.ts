
export interface loginResponse 
{
  token: string,
  refreshToken: string,
  userId: string,
  role: string
};

export interface registerResponse 
{
  statusCode: number,
  message: string
}
