import { randomUUID } from "crypto";
import { Express } from "express";
import SpotifyWebApi from "spotify-web-api-node";

const scopes = ["user-read-playback-state", "user-modify-playback-state"];

export default (app: Express, spotifyApi: SpotifyWebApi) => {
  const state = randomUUID();
  const redirectURI = "/callback";

  app.get("/login", (req, res) => {
    console.log("/login");

    const authorizeUrl = spotifyApi.createAuthorizeURL(scopes, state, true);
    console.log(authorizeUrl);

    return res.redirect(authorizeUrl);
  });

  app.get(redirectURI, async (req, res) => {
    console.log("/callback");
    const { code } = req.query;

    try {
      const result = await spotifyApi.authorizationCodeGrant(code as string);
      spotifyApi.setAccessToken(result.body.access_token);
    } catch (error) {
      console.error(error);
    }
    return res.redirect("/");
  });
};
