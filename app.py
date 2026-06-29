from flask import Flask, request, jsonify
from flask_cors import CORS
from llama_cpp import Llama

app = Flask(__name__)
CORS(app)

# Load your Qwen model
llm = Llama(model_path="./models/Qwen2.5-0.5B-Instruct-Q4_K_M.gguf")

from flask import render_template # Add this import

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/chat', methods=['POST'])
def chat():
    data = request.json
    user_input = data.get('message', '')
    context = data.get('context', '')
    
    # Give the LLM the context before the user asks the question
    prompt = f"<|im_start|>system\nYou are an AI assistant. Use the following context to help the user: {context}<|im_end|>\n<|im_start|>user\n{user_input}<|im_end|>\n<|im_start|>assistant\n"
    
    output = llm(prompt, max_tokens=150)
    return jsonify({"response": output['choices'][0]['text']})


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=3000)
