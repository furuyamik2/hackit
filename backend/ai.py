import torch
from transformers import AutoTokenizer, AutoModelForCausalLM, BitsAndBytesConfig

def main():
    # --- 1. モデルの選択 ---
    # Hugging Face Hubで公開されているモデルIDを指定します。
    # Gemma 3の正式なモデルIDが公開されたら、それに置き換えてください。
    model_id = "google/gemma-2-9b-it" # 例としてGemma 2の指示モデルを使用

    # --- 2. 量子化設定 (メモリ削減のため) ---
    # これにより、VRAMが少ないGPUでも大規模モデルを動かしやすくなります。
    quantization_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_compute_dtype=torch.bfloat16
    )

    print(f"モデル '{model_id}' をロードしています...")
    print("初回はモデルのダウンロードに時間がかかります。")

    # --- 3. トークナイザーとモデルのロード ---
    # Step 2のログイン情報がここで自動的に使われます。
    tokenizer = AutoTokenizer.from_pretrained(model_id)

    model = AutoModelForCausalLM.from_pretrained(
        model_id,
        quantization_config=quantization_config,
        device_map="auto", # 自動でGPU/CPUを割り当て
    )

    print("モデルのロードが完了しました。")

    # --- 4. プロンプトの準備 ---
    # 指示モデルでは、このように役割を分けたチャット形式が非常に重要です。
    chat = [
        {"role": "user", "content": "Hugging Face Transformersライブラリの主な利点を3つ教えてください。"}
    ]

    # モデルの学習時に使われた形式に自動で整形してくれる便利な機能
    prompt = tokenizer.apply_chat_template(chat, tokenize=False, add_generation_prompt=True)

    # --- 5. テキスト生成 ---
    print("\nテキストを生成中...")

    # プロンプトをトークンIDに変換してGPUに送る
    inputs = tokenizer.encode(prompt, add_special_tokens=False, return_tensors="pt").to(model.device)

    # テキスト生成の実行
    outputs = model.generate(
        input_ids=inputs,
        max_new_tokens=512,  # 生成する最大トークン数
        do_sample=True,      # ランダム性を加える
        temperature=0.7,     # 数値が低いほど正確に、高いほど創造的になる
        top_p=0.95,          # 生成する単語の候補を絞る
    )

    # --- 6. 結果の表示 ---
    # 生成されたトークンIDを人間が読めるテキストに変換
    response_text = tokenizer.decode(outputs[0], skip_special_tokens=True)

    print("\n✅ 生成されたテキスト:")
    # 応答部分だけを綺麗に切り出して表示
    print(response_text[len(prompt):].strip())


if __name__ == "__main__":
    main()
