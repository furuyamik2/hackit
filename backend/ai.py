### backend/ai.py
import os
import torch
import openai
import google.generativeai as genai
from transformers import AutoTokenizer, AutoModelForCausalLM, BitsAndBytesConfig
from typing import Optional
from dotenv import load_dotenv

# .envファイルを読み込み
load_dotenv()

# ── モデルタイプの設定 ──────────────────────────────────────
# 環境変数でモデルタイプを切り替え
MODEL_TYPE = os.environ.get("MODEL_TYPE", "local").lower()  # "local", "openai", or "gemini"

# ── ローカルモデル設定 ──────────────────────────────────────
LOCAL_MODEL_ID = os.environ.get("LOCAL_MODEL_ID", "google/gemma-2-2b-it")
HF_TOKEN = os.environ.get("HF_HUB_TOKEN")

# ── OpenAI設定 ──────────────────────────────────────────────
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
OPENAI_MODEL = os.environ.get("OPENAI_MODEL", "gpt-3.5-turbo")

# ── Gemini設定 ──────────────────────────────────────────────
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-pro")

# グローバル変数
tokenizer = None
model = None
openai_client = None
gemini_model = None

# 量子化設定（ローカルモデル用）
quant_cfg = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_quant_type="nf4",
    bnb_4bit_compute_dtype=torch.bfloat16
)


async def initialize_model():
    """
    アプリ起動時に一度だけ呼び出してモデルとトークナイザーをロードする
    """
    global tokenizer, model, openai_client, gemini_model
    
    if MODEL_TYPE == "openai":
        # OpenAI クライアントの初期化
        if openai_client is None:
            if not OPENAI_API_KEY:
                raise ValueError("OPENAI_API_KEY environment variable is required for OpenAI model")
            
            print(">>> Initializing OpenAI client...")
            openai_client = openai.OpenAI(api_key=OPENAI_API_KEY)
            print(">>> OpenAI client initialization complete.")
    
    elif MODEL_TYPE == "local":
        # ローカルモデルの初期化
        if tokenizer is None or model is None:
            if not HF_TOKEN:
                print("Warning: HF_HUB_TOKEN not set. Some models may require authentication.")
            
            print(">>> Initializing local tokenizer and model...")
            tokenizer = AutoTokenizer.from_pretrained(
                LOCAL_MODEL_ID,
                use_auth_token=HF_TOKEN
            )
            model = AutoModelForCausalLM.from_pretrained(
                LOCAL_MODEL_ID,
                quantization_config=quant_cfg,
                device_map="auto",
                use_auth_token=HF_TOKEN
            )
            print(">>> Local model initialization complete.")
    
    elif MODEL_TYPE == "gemini":
        # Gemini APIの初期化
        if gemini_model is None:
            if not GEMINI_API_KEY:
                raise ValueError("GEMINI_API_KEY environment variable is required for Gemini model")
            
            print(">>> Initializing Gemini API...")
            genai.configure(api_key=GEMINI_API_KEY)
            gemini_model = genai.GenerativeModel(GEMINI_MODEL)
            print(">>> Gemini API initialization complete.")
    
    else:
        raise ValueError(f"Invalid MODEL_TYPE: {MODEL_TYPE}. Use 'local', 'openai', or 'gemini'")
    
    return True  # 成功を示す値を返す


def generate_response(chat_history: list[str], max_new_tokens: int = 128) -> str:
    """
    与えられた chat_history をもとにモデルから応答を生成する
    chat_history: ["ユーザー: こんにちは", "AI: はい"] のようなリスト
    """
    if MODEL_TYPE == "openai":
        return generate_response_openai(chat_history, max_new_tokens)
    elif MODEL_TYPE == "local":
        return generate_response_local(chat_history, max_new_tokens)
    elif MODEL_TYPE == "gemini":
        return generate_response_gemini(chat_history, max_new_tokens)
    else:
        raise ValueError(f"Invalid MODEL_TYPE: {MODEL_TYPE}")


def generate_response_openai(chat_history: list[str], max_new_tokens: int = 128) -> str:
    """
    OpenAI APIを使用して応答を生成
    """
    if openai_client is None:
        raise RuntimeError("OpenAI client not initialized. Call initialize_model() first.")
    
    # チャット履歴をOpenAI形式に変換
    messages = []
    for message in chat_history:
        if message.startswith("ユーザー: "):
            messages.append({"role": "user", "content": message[4:]})
        elif message.startswith("AI: "):
            messages.append({"role": "assistant", "content": message[4:]})
        else:
            # 不明な形式の場合はユーザーメッセージとして扱う
            messages.append({"role": "user", "content": message})
    
    try:
        response = openai_client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=messages,
            max_tokens=max_new_tokens,
            temperature=0.7,
            top_p=0.9
        )
        return response.choices[0].message.content.strip()
    
    except Exception as e:
        print(f"OpenAI API error: {e}")
        return "申し訳ございません。一時的なエラーが発生しました。"


def generate_response_local(chat_history: list[str], max_new_tokens: int = 128) -> str:
    """
    ローカルモデルを使用して応答を生成
    """
    if tokenizer is None or model is None:
        raise RuntimeError("Local model not initialized. Call initialize_model() first.")
    
    prompt = "\n".join(chat_history) + "\nAI:"
    inputs = tokenizer(prompt, return_tensors="pt").to(model.device)
    outputs = model.generate(
        **inputs,
        max_new_tokens=max_new_tokens,
        do_sample=True,
        temperature=0.7,
        top_p=0.9,
        eos_token_id=tokenizer.eos_token_id,
    )
    text = tokenizer.decode(
        outputs[0][inputs["input_ids"].shape[-1]:],
        skip_special_tokens=True
    ).strip()
    return text


def generate_response_gemini(chat_history: list[str], max_new_tokens: int = 128) -> str:
    """
    Gemini APIを使用して応答を生成
    """
    if gemini_model is None:
        raise RuntimeError("Gemini model not initialized. Call initialize_model() first.")
    
    try:
        # チャット履歴をGemini形式に変換
        chat = gemini_model.start_chat(history=[])
        
        # 最新のユーザーメッセージを取得
        latest_user_message = None
        for message in reversed(chat_history):
            if message.startswith("ユーザー: "):
                latest_user_message = message[4:]
                break
        
        if not latest_user_message:
            latest_user_message = "こんにちは"
        
        # Gemini APIで応答を生成
        response = chat.send_message(latest_user_message)
        return response.text.strip()
    
    except Exception as e:
        print(f"Gemini API error: {e}")
        return "申し訳ございません。一時的なエラーが発生しました。"


def get_model_info() -> dict:
    """
    現在のモデル設定情報を取得
    """
    info = {
        "model_type": MODEL_TYPE,
        "local_model_id": LOCAL_MODEL_ID if MODEL_TYPE == "local" else None,
        "openai_model": OPENAI_MODEL if MODEL_TYPE == "openai" else None,
        "gemini_model": GEMINI_MODEL if MODEL_TYPE == "gemini" else None,
        "hf_token_set": bool(HF_TOKEN) if MODEL_TYPE == "local" else None,
        "openai_api_key_set": bool(OPENAI_API_KEY) if MODEL_TYPE == "openai" else None,
        "gemini_api_key_set": bool(GEMINI_API_KEY) if MODEL_TYPE == "gemini" else None
    }
    
    return info


def test_ai_functions():
    """
    AI機能のテスト用関数
    """
    print("=== AI Functions Test ===")
    
    # モデル情報の表示
    model_info = get_model_info()
    print(f"Model Type: {model_info['model_type']}")
    
    if MODEL_TYPE == "local":
        print(f"Local Model ID: {model_info['local_model_id']}")
        print(f"HF Token set: {'Yes' if model_info['hf_token_set'] else 'No'}")
    elif MODEL_TYPE == "openai":
        print(f"OpenAI Model: {model_info['openai_model']}")
        print(f"OpenAI API Key set: {'Yes' if model_info['openai_api_key_set'] else 'No'}")
    elif MODEL_TYPE == "gemini":
        print(f"Gemini Model: {model_info['gemini_model']}")
        print(f"Gemini API Key set: {'Yes' if model_info['gemini_api_key_set'] else 'No'}")
    
    try:
        # モデルの初期化
        print(f"\n1. Testing {MODEL_TYPE} model initialization...")
        initialize_model()
        print(f"✓ {MODEL_TYPE.capitalize()} model initialization successful")
        
        # 簡単な応答生成テスト
        print("\n2. Testing response generation...")
        test_chat = ["ユーザー: こんにちは、今日の天気はどうですか？"]
        response = generate_response(test_chat, max_new_tokens=50)
        print(f"✓ Response generated: {response}")
        
        # 複数の会話履歴でのテスト
        print("\n3. Testing with conversation history...")
        test_chat_history = [
            "ユーザー: こんにちは",
            "AI: こんにちは！何かお手伝いできることはありますか？",
            "ユーザー: Pythonについて教えてください"
        ]
        response2 = generate_response(test_chat_history, max_new_tokens=100)
        print(f"✓ Response with history: {response2}")
        
        print("\n=== All tests passed! ===")
        
    except Exception as e:
        print(f"✗ Error during testing: {e}")
        print("Please check your environment variables and model configuration.")


if __name__ == "__main__":
    # 単体デバッグ用のメイン処理
    print("Starting AI module in debug mode...")
    print(f"Current model type: {MODEL_TYPE}")
    test_ai_functions()