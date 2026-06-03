import json

import openai

from app.core.config import OPENAI_API_KEY
from app.core.prompts import CLASSIFICATION_PROMPT, EVOLLIS_CONTEXT, RESPONSE_TEMPLATES

openai.api_key = OPENAI_API_KEY


def classify_locally(message: str) -> tuple[str, float]:
    normalized = message.lower()

    billing_keywords = ["facture", "facturation", "prélèvement", "prelevement", "paiement", "mensualit", "résiliation", "resiliation", "remboursement"]
    technical_keywords = ["panne", "cass", "bug", "erreur", "ne marche", "bloqu", "garantie", "écran", "ecran", "batterie"]
    tradein_keywords = ["restitution", "retour", "reprise", "trade-in", "tradein", "upgrade", "fin de contrat", "renouvellement", "reconditionn"]

    if any(keyword in normalized for keyword in billing_keywords):
        return "BILLING", 0.78
    if any(keyword in normalized for keyword in technical_keywords):
        return "TECHNICAL", 0.78
    if any(keyword in normalized for keyword in tradein_keywords):
        return "TRADEIN", 0.78
    return "GENERAL", 0.55


def fallback_response(category: str) -> str:
    if category == "BILLING":
        return (
            "Je peux vous aider sur la facturation ou l'abonnement. Vérifiez d'abord le libellé et la date du prélèvement, "
            "puis comparez-les avec votre échéance prévue. Si le montant vous semble incorrect, préparez la référence de contrat "
            "et contactez le service facturation pour un contrôle."
        )
    if category == "TECHNICAL":
        return (
            "Je peux vous guider pour un souci technique. Indiquez le modèle de l'appareil, puis décrivez le symptôme exact "
            "(panne, casse, écran, batterie, démarrage). Si l'appareil est endommagé, l'assurance casse/vol peut s'appliquer selon le contrat."
        )
    if category == "TRADEIN":
        return (
            "Pour une restitution ou une reprise, il faut généralement vérifier la fin de contrat, l'état de l'appareil et la procédure de retour. "
            "Si vous voulez un upgrade, je peux vous indiquer les étapes à suivre pour préparer l'échange et la reprise."
        )
    return (
        "Evollis propose de la location longue durée d'appareils avec services inclus, comme l'assurance et l'extension de garantie. "
        "Dites-moi si votre demande concerne un abonnement, un appareil, ou la restitution en fin de contrat, et je vous réponds plus précisément."
    )


def classify_message(message: str) -> tuple[str, float]:
    try:
        classification_resp = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": CLASSIFICATION_PROMPT},
                {"role": "user", "content": message},
            ],
            max_tokens=200,
            temperature=0.0,
        )
        classification_text = classification_resp["choices"][0]["message"]["content"]
        classification = json.loads(classification_text)
        category = classification.get("category", "GENERAL")
        confidence = classification.get("confidence", 0.8)
        return category, confidence
    except Exception:
        return classify_locally(message)


def generate_response(category: str, message: str, history: list[dict]) -> str:
    system_prompt = (
        f"{EVOLLIS_CONTEXT}\n\n## Instructions pour cette réponse\n"
        f"{RESPONSE_TEMPLATES.get(category, RESPONSE_TEMPLATES['GENERAL'])}\n\n"
        "Réponds en français, de façon professionnelle mais chaleureuse. Maximum 150 mots. Propose toujours une action concrète."
    )

    messages = [{"role": "system", "content": system_prompt}]
    for msg in history[-6:]:
        if isinstance(msg, dict) and "role" in msg and "content" in msg:
            messages.append({"role": msg["role"], "content": msg["content"]})
    messages.append({"role": "user", "content": message})

    try:
        resp = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=messages,
            max_tokens=400,
            temperature=0.2,
        )
        return resp["choices"][0]["message"]["content"]
    except Exception:
        return fallback_response(category)
