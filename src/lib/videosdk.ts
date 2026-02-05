import jwt from "jsonwebtoken";

const API_KEY = process.env.VIDEOSDK_API_KEY;
const SECRET_KEY = process.env.VIDEOSDK_SECRET_KEY;

export const generateVideoSDKToken = () => {
  if (!API_KEY || !SECRET_KEY) {
    throw new Error(
      "VIDEOSDK_API_KEY or VIDEOSDK_SECRET_KEY missing from environment",
    );
  }

  const payload = {
    apikey: API_KEY,
    permissions: ["allow_join", "allow_mod"], // allow_mod is needed for some management tasks
    version: 2,
  };

  const jwtToken = jwt.sign(payload, SECRET_KEY, {
    algorithm: "HS256",
    expiresIn: "24h",
    jwtid: Math.floor(Date.now() / 1000).toString(),
  });

  return jwtToken;
};

export const fetchActiveSessions = async () => {
  const token = generateVideoSDKToken();
  const url = `https://api.videosdk.live/v2/sessions?status=active`;

  const options = {
    method: "GET",
    headers: { Authorization: token, "Content-Type": "application/json" },
  };

  const response = await fetch(url, options);
  const data = await response.json();
  return data.data || []; // data.data contains the list of sessions
};
