# backend/test_model_switching.py
"""
AIモデル切り替えのテストスクリプト
環境変数を変更して異なるモデルをテストできます
"""

import os
import sys
from ai import initialize_model, generate_response, get_model_info

def test_model(model_type: str):
    """指定されたモデルタイプでテストを実行"""
    print(f"\n{'='*60}")
    print(f"Testing {model_type.upper()} model")
    print(f"{'='*60}")
    
    # 環境変数を設定
    os.environ["MODEL_TYPE"] = model_type
    
    try:
        # モデル情報を表示
        model_info = get_model_info()
        print(f"Model Type: {model_info['model_type']}")
        
        if model_type == "local":
            print(f"Local Model ID: {model_info['local_model_id']}")
            print(f"HF Token set: {'Yes' if model_info['hf_token_set'] else 'No'}")
        elif model_type == "openai":
            print(f"OpenAI Model: {model_info['openai_model']}")
            print(f"OpenAI API Key set: {'Yes' if model_info['openai_api_key_set'] else 'No'}")
        elif model_type == "gemini":
            print(f"Gemini Model: {model_info['gemini_model']}")
            print(f"Gemini API Key set: {'Yes' if model_info['gemini_api_key_set'] else 'No'}")
        
        # モデルの初期化
        print(f"\nInitializing {model_type} model...")
        initialize_model()
        print(f"✓ {model_type.capitalize()} model initialization successful")
        
        # 応答生成テスト
        test_chat = ["ユーザー: こんにちは、簡単な自己紹介をお願いします。"]
        print(f"\nGenerating response with {model_type}...")
        response = generate_response(test_chat, max_new_tokens=100)
        print(f"✓ Response: {response}")
        
        return True
        
    except Exception as e:
        print(f"✗ Error with {model_type} model: {e}")
        return False

def main():
    """メイン関数"""
    print("AI Model Switching Test")
    print("="*60)
    
    # テストするモデルタイプ
    models_to_test = ["local", "openai", "gemini"]
    
    results = {}
    
    for model_type in models_to_test:
        success = test_model(model_type)
        results[model_type] = success
    
    # 結果サマリー
    print(f"\n{'='*60}")
    print("TEST SUMMARY")
    print(f"{'='*60}")
    
    for model_type, success in results.items():
        status = "✓ PASS" if success else "✗ FAIL"
        print(f"{status} {model_type.upper()}")
    
    print(f"\n{'='*60}")
    print("USAGE INSTRUCTIONS")
    print(f"{'='*60}")
    print("To use a specific model, set the MODEL_TYPE environment variable:")
    print()
    print("For Local Model:")
    print("  set MODEL_TYPE=local")
    print("  python ai.py")
    print()
    print("For OpenAI:")
    print("  set MODEL_TYPE=openai")
    print("  set OPENAI_API_KEY=your_api_key")
    print("  python ai.py")
    print()
    print("For Gemini API:")
    print("  set MODEL_TYPE=gemini")
    print("  set GEMINI_API_KEY=your_api_key")
    print("  python ai.py")
    print()
    print("Or use the configuration file:")
    print("  Copy ai_config_example.env to .env")
    print("  Modify MODEL_TYPE in .env file")
    print("  python ai.py")

if __name__ == "__main__":
    main() 