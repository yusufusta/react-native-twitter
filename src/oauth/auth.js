import {Linking} from 'react-native';

import URLSearchParams from 'url-search-params';

import request from './request';
import {query} from '../util';

function getRequestToken(tokens, accessType) {
  const method = 'POST';
  const url = 'https://api.twitter.com/oauth/access_token';
  const body = accessType;

  return request(tokens, url, {method: method, body: body})
    .then(response => response.text())
    .then((text) => {
      var q = {};
      text.split('&').forEach(function(i){
        q[i.split('=')[0]]=i.split('=')[1];
      });
      return q;
    });
}

function getAccessToken(
  {consumerKey, consumerSecret, requestToken, requestTokenSecret},
  oauthVerifier,
) {
  const method = 'POST';
  const url = 'https://api.twitter.com/oauth/access_token';
  return request(
    {consumerKey, consumerSecret, oauthToken: requestToken, oauthTokenSecret: requestTokenSecret},
    url,
    {method},
    {oauth_verifier: oauthVerifier},
  )
    .then(response => response.text())
    .then((text) => {
      const params = new URLSearchParams(text);
      return {
        accessToken: params.get('oauth_token'),
        accessTokenSecret: params.get('oauth_token_secret'),
        id: params.get('user_id'),
        name: params.get('screen_name'),
      };
    });
}

const verifierDeferreds = new Map();

Linking.addEventListener('url', ({url}) => {
  const params = new URLSearchParams(url.split('?')[1]);
  if (params.has('oauth_token') && verifierDeferreds.has(params.get('oauth_token'))) {
    const verifierDeferred = verifierDeferreds.get(params.get('oauth_token'));
    verifierDeferreds.delete(params.get('oauth_token'));
    if (params.has('oauth_verifier')) {
      verifierDeferred.resolve(params.get('oauth_verifier'));
    } else {
      verifierDeferred.reject(new Error('denied'));
    }
  }
});

export default async function auth(
  tokens,accessType
) {
  const usePin = true;
  return await getRequestToken(
    tokens,
    accessType,
  );
  Linking.openURL(`https://api.twitter.com/oauth/${forSignIn ? 'authenticate' : 'authorize'}?${
    query({oauth_token: requestToken, force_login: forceLogin, screen_name: screenName})
  }`);
  return getAccessToken(
    {...tokens, requestToken, requestTokenSecret},
    await (
      usePin ?
        callbackUrl :
        new Promise((resolve, reject) => {verifierDeferreds.set(requestToken, {resolve, reject});})
    ),
  );
}
