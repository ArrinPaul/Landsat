# Vercel Deployment Guide

## 🚀 How to Deploy to Vercel

### Step 1: Enable Firestore API (REQUIRED)
1. Go to: https://console.developers.google.com/apis/api/firestore.googleapis.com/overview?project=landsat-470215
2. Click **"Enable"** button
3. Wait 2-3 minutes for the API to activate

### Step 2: Add Environment Variables in Vercel

Go to your Vercel project dashboard:
1. Click on your project
2. Go to **Settings** → **Environment Variables**
3. Add the following variables (click "Add New" for each):

#### Required Variables

**1. GOOGLE_APPLICATION_CREDENTIALS_JSON**
```
{"type": "service_account","project_id": "landsat-470215","private_key_id": "5bba3de89dc10fd9aa2595f319a56fcd35c03505","private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCjhmqNGqtcYK54\nIDGNm1vcW5Pu8Tld4Os/g/pozkbmxd09RiItF0gfvpEoXuGSJsPX+YKisWOiZBWL\nv68/+bxhbGCLB1YdF3piADMRV6hauKoUbVO8exqjSaduX/O+g1XMduAGw436SbVk\nuX9RBU6bUzSHqZI/ulnCfszemQ2NiT44AKwiJLfTcuqZ6hB8rRfkfyK8S04Om4rl\nQkUh9k0qBPENiW1hWxTFMVFO+mY4bXQh8n2/RrnQvXm6kTFDmwTcYrq7oKgXpllI\neYuTuR6/43bywEkuyLY1c+3F2aJWjYTCJM2ZEzzPmmWj446AYATMPQ7s8fHBVp/5\nNgNoD953AgMBAAECggEAL+eNyV55uus70UclHSXZKFnPoZ0bQCxG3mmMby2Wyb5H\nTM8B7hG2+E28eoYpMMaYcunOYljzJjyJr1HtRiGkFSpJshDpIkahfJowW7FBSap1\ncNyCPmIV8KYAHa6QWkxhUy+z+2dIbX0wXZyV9qdGWuxqJCACDxdJelfpLoDJ3p9Q\nelwFOf09OBPFYS77cpOUI22dTHo77YHHgGcvCDxyCd2MNtW3xxX1dZgCGB58HGZy\n9LkGD2mSowwY3AGUFM0YEUJi0fGp0Bl9SASuTGrrztO5+G3YaYpYdiNKHKspen0z\n2X4tEQc3Xkg9soAdM11XvySvoxT+AUbdtxN98cPySQKBgQDkLNmOT8rSS2Selq1x\n1VmeN5ZwnmF+1pKVIcmGld70IN5S7CJL2k9m6n1GPqav7OCFg4v3boaMsGj5oM/t\n4CMc5v+m5n3klb+WyJlzr3vh3kmkyTyha2GSDsw+NyN5ciVKD2/KQIzwhTcWuDyg\nSMXAlaa1QyTTnkSmsG2Ta5tSowKBgQC3d1M7ITc5sQ7gpczphEittGfuxalfv/dK\n1QzThBxwDzktd1dxJcptrwBfEQM8+GfHXG/0aJ+dKfKMxDzr/gVQsU+OLmMoLrg+\n31/KAZWgRsW4Ic9GU49vxnCjuxH50+dkMpfpJ7EOET5VUwUc3dgRdRrTpWSC2GbA\nalrzk4SWHQKBgQDNLruQKpaTVrKrnYlopNcK3KfOq822VlPIAXMMMHcmBuyFmswY\nc78VJ+XxJeOUrakUxr81iFE78GLln0N7gCNzGRJpzjkFNdfsSoUbL4FyEgcdRMzd\nxwcdZWsqw0CGNCvuFkWLlVJn8xMfvhrec7JIRQp9U1ypY1gOoPZYK9qniwKBgQCp\n8eNsO2lvjF5uo8a7bKjyFtHLcNdi9Ww5qj5WU+MPvlpFjm22Rr5LebbLWPP571Qa\nbLrb2Go56BhgYorYQ5Zi18wMtVVubFCJFNsjQPJ74/LUjKT2zQJqFJRUZj3RgIOv\n4dmrxPOSR1DJMrzir3CtQx+Ve3guaAxOInabeENx1QKBgDdKR6loolcxp00CNGXB\nkpuP+c5NPujO6F5fBt7e+pMrzMpBaFRV7ix7HJieU9PRhGyi4kNNjXVsCtSOebJX\nE3/16kFWG3aFPRhC9UOSpYN8Y2bnmtGohgq9rksTPpROaYWK8NdJpjHyQJ1MCJrD\nAT26xTAfp+e1FdAgL3R8Lh8c\n-----END PRIVATE KEY-----\n","client_email": "landsat@landsat-470215.iam.gserviceaccount.com","client_id": "117392769217260606533","auth_uri": "https://accounts.google.com/o/oauth2/auth","token_uri": "https://oauth2.googleapis.com/token","auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/landsat%40landsat-470215.iam.gserviceaccount.com","universe_domain": "googleapis.com"}
```
> ⚠️ **CRITICAL:** This fixes the "job not found" error in production

**2. GROQ_API_KEY**
```
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
```

#### Recommended Variables (for better reliability)

**3. GEMINI_API_KEY**
```
AIzaSyAj9mPhJZD_SlPuOIAng7alwEJhn0YZmG4
```

**4. HUGGINGFACE_API_KEY**
```
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
```

#### Optional (if you want to enable Mistral)

**5. MISTRAL_API_KEY**
```
Qp4SlVkwnrYNahBVamsTBJcXbLhSlHWt
```

### Step 3: Configure Each Variable

For **each** environment variable you add:
1. Click **"Add New"**
2. Enter the **Name** (e.g., `GROQ_API_KEY`)
3. Paste the **Value** (from above)
4. Select environments: ✅ **Production**, ✅ **Preview**, ✅ **Development**
5. Click **Save**

### Step 4: Deploy

After adding all variables:

```bash
git add .
git commit -m "Enable Firebase for production deployment"
git push
```

Vercel will automatically redeploy with the new environment variables.

---

## ✅ Verification

After deployment:
1. Go to your live site
2. Test the "Compute Metrics" feature
3. It should now work without "job not found" errors

## 🔧 Troubleshooting

**If you still get "job not found":**
- Verify Firestore API is enabled (Step 1)
- Check all env vars are added in Vercel dashboard
- Redeploy: `git commit --allow-empty -m "redeploy" && git push`

**If you get Firebase errors:**
- Make sure `GOOGLE_APPLICATION_CREDENTIALS_JSON` is added as **one line** (no line breaks in the Vercel UI)
- The JSON value should be exactly as shown above
