import json
import re

import openai

from app.core.config import OPENAI_API_KEY
from app.core.prompts import CLASSIFICATION_PROMPT, EVOLLIS_CONTEXT, RESPONSE_TEMPLATES

openai.api_key = OPENAI_API_KEY


def is_openai_configured() -> bool:
    key = (OPENAI_API_KEY or "").strip()
    if not key:
        return False
    if key.lower().startswith("dummy"):
        return False
    return True


def check_openai_status() -> dict:
    if not is_openai_configured():
        return {
            "configured": False,
            "reachable": False,
            "model_call_ok": False,
            "error": "OPENAI_API_KEY absente, vide ou valeur de test invalide.",
        }

    try:
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "Reply with OK only."},
                {"role": "user", "content": "ping"},
            ],
            max_tokens=5,
            temperature=0.0,
        )
        content = response["choices"][0]["message"]["content"]
        return {
            "configured": True,
            "reachable": True,
            "model_call_ok": True,
            "error": None,
            "sample": content,
        }
    except Exception as exc:
        return {
            "configured": True,
            "reachable": False,
            "model_call_ok": False,
            "error": str(exc),
        }


def is_uninterpretable_message(message: str) -> bool:
    normalized = message.strip().lower()
    if len(normalized) < 2:
        return True
    if not re.search(r"[a-zA-Z0-9éèêëàâîïôöùûüç]", normalized):
        return True
    cleaned = re.sub(r"[^a-zA-Z0-9éèêëàâîïôöùûüç]", "", normalized)
    if len(cleaned) < 2:
        return True
    if re.fullmatch(r"(.)\1{3,}", cleaned):
        return True
    return False


def clarification_response() -> str:
    return (
        "Je n'ai pas compris votre demande. Pouvez-vous la reformuler en indiquant s'il s'agit plutot de facturation, d'un probleme technique, d'une reprise d'appareil ou d'une question generale ? "
        "Si besoin, vous pouvez aussi consulter la FAQ Evollis."
    )


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


def detect_detail(message: str, keywords: list[str], default: str) -> str:
    normalized = message.lower()
    for keyword in keywords:
        if keyword in normalized:
            return keyword
    return default


def should_reuse_existing_category(message: str, confidence: float, has_existing_ticket: bool) -> bool:
    if not has_existing_ticket:
        return False

    normalized = message.strip().lower()
    short_follow_ups = {
        "oui",
        "non",
        "ok",
        "d'accord",
        "dac",
        "je vois",
        "toujours",
        "encore",
        "possible",
        "pas possible",
        "ca marche pas",
        "cela ne marche pas",
    }

    if normalized in short_follow_ups:
        return True

    return len(normalized.split()) <= 5 and confidence < 0.75


STOPWORDS = {
    "alors", "avec", "avoir", "bien", "cela", "cette", "comme", "dans", "des", "donc", "elle", "elles",
    "encore", "entre", "est", "ete", "etre", "fait", "fais", "fois", "j", "jai", "juste", "les", "leur",
    "mais", "mes", "moi", "mon", "nous", "notre", "par", "pas", "plus", "pour", "que", "qui", "ses",
    "son", "sur", "tes", "ton", "tres", "une", "vous", "votre", "quoi", "quel", "quelle", "combien",
    "rappelle", "souviens", "dis", "dit", "comment", "quand", "dans", "cela", "ca", "cest", "etre",
}


def tokenize(text: str) -> list[str]:
    return [
        token
        for token in re.findall(r"[a-zA-Z0-9éèêëàâîïôöùûüç]+", text.lower())
        if len(token) > 2 and token not in STOPWORDS
    ]


def build_conversation_memory(history: list[dict], ticket: dict | None, message: str) -> list[str]:
    facts: list[str] = []
    seen: set[str] = set()
    sources = [msg.get("content", "") for msg in history if isinstance(msg, dict) and msg.get("role") == "user"]
    if ticket and ticket.get("message"):
        sources.append(str(ticket.get("message")))
    sources.append(message)

    for source in sources:
        text = " ".join(source.strip().split())
        lowered = text.lower()
        if not text or lowered in seen:
            continue
        if len(text) < 8:
            continue
        if any(marker in lowered for marker in ["j'ai", "je ", "mon ", "ma ", "mes ", "nous ", "notre "]) or re.search(r"\d", text):
            facts.append(text)
            seen.add(lowered)

    return facts[-6:]


def build_memory_context(memory: list[str]) -> str:
    if not memory:
        return "## Memoire conversationnelle\n- Aucun fait client memorise pour le moment."

    lines = ["## Memoire conversationnelle", "- Faits deja mentionnes par le client :"]
    lines.extend([f"  {index + 1}. {fact}" for index, fact in enumerate(memory)])
    return "\n".join(lines)


def is_memory_question(message: str) -> bool:
    normalized = message.lower()
    triggers = ["tu te souviens", "je t'ai dit", "j'ai dit", "rappelle", "combien", "quel", "quelle", "quoi deja", "c'est quoi deja", "c est quoi deja"]
    return any(trigger in normalized for trigger in triggers)


def find_referenced_fact(message: str, history: list[dict], ticket: dict | None) -> str | None:
    keywords = set(tokenize(message))
    candidates = [msg.get("content", "") for msg in history if isinstance(msg, dict) and msg.get("role") == "user"]
    if ticket and ticket.get("message"):
        candidates.append(str(ticket.get("message")))

    best_match = None
    best_score = 0
    for candidate in reversed(candidates[:-1] if candidates else candidates):
        candidate_keywords = set(tokenize(candidate))
        score = len(keywords & candidate_keywords)
        if score > best_score:
            best_score = score
            best_match = candidate

    return best_match if best_score > 0 else None


def get_recent_user_facts(history: list[dict], ticket: dict | None, current_message: str) -> list[str]:
    facts: list[str] = []
    seen: set[str] = set()

    for msg in history:
        if not isinstance(msg, dict) or msg.get("role") != "user":
            continue
        content = " ".join(str(msg.get("content", "")).strip().split())
        lowered = content.lower()
        if not content or lowered in seen:
            continue
        seen.add(lowered)
        facts.append(content)

    if ticket and ticket.get("message"):
        content = " ".join(str(ticket.get("message", "")).strip().split())
        lowered = content.lower()
        if content and lowered not in seen:
            facts.append(content)

    current_normalized = " ".join(current_message.strip().split()).lower()
    return [fact for fact in facts if fact.lower() != current_normalized][-3:]


def build_recent_facts_text(history: list[dict], ticket: dict | None, current_message: str) -> str:
    facts = get_recent_user_facts(history, ticket, current_message)
    if not facts:
        return ""
    return "Je garde en tete ce que vous m'avez deja indique : " + " ; ".join(facts) + ". "


def fallback_response(category: str, message: str, history: list[dict], ticket: dict | None = None) -> str:
    normalized = message.lower()
    is_follow_up = len(history) >= 2 or bool(ticket and ticket.get("response"))
    memory = build_conversation_memory(history, ticket, message)
    referenced_fact = find_referenced_fact(message, history, ticket)
    recent_facts_text = build_recent_facts_text(history, ticket, message)

    if is_memory_question(message) and referenced_fact:
        return (
            f"D'apres nos echanges, vous aviez indique : \"{referenced_fact}\". "
            "Si vous voulez, je peux repartir de cette information pour continuer la demande."
        )

    if is_memory_question(message) and recent_facts_text:
        return recent_facts_text + "Je peux repartir de ces elements si vous voulez affiner la demande ou comparer plusieurs options."

    if category == "BILLING":
        detail = detect_detail(normalized, ["facture", "prélèvement", "prelevement", "résiliation", "resiliation", "remboursement"], "votre dossier de facturation")
        opening = "Je reprends votre demande" if is_follow_up else "Je peux vous aider"
        action = (
            "Pouvez-vous me partager la date concernee, le montant et, si vous l'avez, la reference de contrat ?"
            if "montant" not in normalized and "contrat" not in normalized
            else "Avec ces elements, l'etape utile est de verifier l'echeance et de faire controler le dossier facturation."
        )
        return (
            f"{recent_facts_text}{opening} au sujet de {detail}. Si le prelevement ou la facture parait anormal(e), comparez d'abord la date et le montant avec votre echeance prevue. "
            f"{action} Si besoin, je peux aussi vous aider a preparer un recapitulatif clair avant contact avec le service facturation."
        )

    if category == "TECHNICAL":
        detail = detect_detail(normalized, ["ecran", "batterie", "panne", "cass", "demarr", "bug"], "le probleme technique")
        opening = "Je poursuis avec vous" if is_follow_up else "Je peux vous guider"
        next_step = (
            "Dites-moi le modele exact et ce qui se passe quand vous essayez d'utiliser l'appareil."
            if all(keyword not in normalized for keyword in ["iphone", "samsung", "pc", "tablette", "galaxy"])
            else "Precisez si le souci est permanent ou intermittent, et depuis quand il a commence."
        )
        return (
            f"{recent_facts_text}{opening} sur {detail}. {next_step} Selon le cas, on pourra orienter vers un diagnostic, une prise en charge garantie ou l'assurance casse/vol si l'appareil a ete endommage."
        )

    if category == "TRADEIN":
        detail = detect_detail(normalized, ["upgrade", "retour", "restitution", "fin de contrat", "renouvellement"], "votre demande de reprise")
        opening = "Je reprends votre dossier" if is_follow_up else "Je peux vous aider"
        return (
            f"{recent_facts_text}{opening} concernant {detail}. La bonne approche est de verifier la situation du contrat, l'etat de l'appareil et le type d'issue souhaitee: retour simple, upgrade ou reprise. "
            "Si vous voulez, je peux vous lister la prochaine etape la plus adaptee selon votre cas."
        )

    opening = "Je continue avec vous" if is_follow_up else "Je peux vous renseigner"
    return (
        f"{recent_facts_text}{opening} sur Evollis et le fonctionnement de votre demande. Evollis propose de la location longue duree avec services inclus, comme l'assurance et l'extension de garantie. "
        "Si vous me dites si votre besoin concerne plutot l'abonnement, l'appareil ou la fin de contrat, je vous reponds de facon plus precise."
    )


def classify_message(message: str) -> tuple[str, float, str]:
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
        return category, confidence, "openai"
    except Exception:
        category, confidence = classify_locally(message)
        return category, confidence, "fallback"


def build_ticket_context(ticket: dict | None) -> str:
    if not ticket:
        return "Aucun contexte de demande precedent."

    return (
        "## Contexte de la demande en cours\n"
        f"- Titre: {ticket.get('title') or 'Sans titre'}\n"
        f"- Categorie actuelle: {ticket.get('category_label') or ticket.get('category') or 'GENERAL'}\n"
        f"- Statut: {ticket.get('status') or 'open'}\n"
        f"- Dernier message client connu: {ticket.get('message') or ''}\n"
        f"- Derniere reponse agent connue: {ticket.get('response') or ''}"
    )


def generate_response(category: str, message: str, history: list[dict], ticket: dict | None = None) -> tuple[str, str]:
    memory = build_conversation_memory(history, ticket, message)
    system_prompt = (
        f"{EVOLLIS_CONTEXT}\n\n## Instructions pour cette réponse\n"
        f"{RESPONSE_TEMPLATES.get(category, RESPONSE_TEMPLATES['GENERAL'])}\n\n"
        f"{build_ticket_context(ticket)}\n\n"
        f"{build_memory_context(memory)}\n\n"
        f"## Recapitulatif recent\n{build_recent_facts_text(history, ticket, message) or '- Aucun recapitulatif recent supplementaire.'}\n\n"
        "Reutilise le contexte de la demande si le client poursuit la meme conversation. "
        "Quand le client te demande de rappeler une information deja donnee, appuie-toi d'abord sur la memoire conversationnelle. "
        "Si une information a deja ete mentionnee par le client, ne fais pas comme si tu la decouvrais. "
        "Reponds en francais, de facon professionnelle mais chaleureuse. "
        "Evite les formulations trop generiques ou robotiques. "
        "Commence par reagir au message precis du client, puis propose la suite utile. "
        "Mixe structure claire et ton naturel. Maximum 180 mots. Propose toujours une action concrete."
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
            temperature=0.45,
        )
        return resp["choices"][0]["message"]["content"], "openai"
    except Exception:
        return fallback_response(category, message, history, ticket), "fallback"
