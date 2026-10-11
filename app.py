import os
import uuid
from flask import Flask, render_template, request, jsonify, send_from_directory
from werkzeug.utils import secure_filename
import database

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = os.path.join(os.path.dirname(__file__), 'uploads')
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16 MB max upload
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}

os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Initialize database
database.init_db()

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/uploads/<path:filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

@app.route('/api/stats', methods=['GET'])
def get_stats():
    items = database.get_items()
    total = len(items)
    found = sum(1 for i in items if i['type'] == 'found')
    lost = sum(1 for i in items if i['type'] == 'lost')
    resolved = sum(1 for i in items if i['status'] in ('claimed', 'returned'))
    return jsonify({
        'total': total,
        'found': found,
        'lost': lost,
        'resolved': resolved
    })

@app.route('/api/items', methods=['GET'])
def list_items():
    item_type = request.args.get('type')
    category = request.args.get('category')
    search = request.args.get('search')
    status = request.args.get('status')

    items = database.get_items(item_type=item_type, category=category, search=search, status=status)
    return jsonify({'items': items})

@app.route('/api/items/<int:item_id>', methods=['GET'])
def get_item(item_id):
    item = database.get_item_by_id(item_id)
    if not item:
        return jsonify({'error': 'Item not found'}), 404
    return jsonify({'item': item})

@app.route('/api/items', methods=['POST'])
def add_item():
    item_type = request.form.get('type')
    title = request.form.get('title')
    category = request.form.get('category')
    location = request.form.get('location')
    item_date = request.form.get('item_date')
    description = request.form.get('description', '')
    poster_name = request.form.get('poster_name')
    poster_email = request.form.get('poster_email')
    poster_phone = request.form.get('poster_phone', '')
    poster_pin = request.form.get('poster_pin')

    if not all([item_type, title, category, location, item_date, poster_name, poster_email, poster_pin]):
        return jsonify({'error': 'Please fill all required fields, including a 4-digit PIN'}), 400

    image_filename = None
    if 'image' in request.files:
        file = request.files['image']
        if file and file.filename and allowed_file(file.filename):
            ext = file.filename.rsplit('.', 1)[1].lower()
            unique_filename = f"{uuid.uuid4().hex}.{ext}"
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
            file.save(file_path)
            image_filename = unique_filename

    item_id = database.create_item({
        'type': item_type,
        'title': title,
        'category': category,
        'location': location,
        'item_date': item_date,
        'description': description,
        'image_filename': image_filename,
        'poster_name': poster_name,
        'poster_email': poster_email,
        'poster_phone': poster_phone,
        'poster_pin': poster_pin
    })

    return jsonify({
        'message': 'Report posted successfully!',
        'item_id': item_id
    }), 201

@app.route('/api/items/<int:item_id>/verify-pin', methods=['POST'])
def verify_pin(item_id):
    data = request.get_json() or {}
    pin = data.get('pin')
    if not pin:
        return jsonify({'error': 'PIN is required'}), 400

    if database.verify_item_pin(item_id, pin):
        item = database.get_item_by_id(item_id, include_contact=True)
        claims, _ = database.get_claims_for_item(item_id, pin)
        return jsonify({
            'valid': True,
            'item': item,
            'claims': claims
        })
    else:
        return jsonify({'error': 'Incorrect PIN for this item'}), 401

@app.route('/api/items/<int:item_id>/claims', methods=['POST'])
def submit_claim(item_id):
    item = database.get_item_by_id(item_id)
    if not item:
        return jsonify({'error': 'Item not found'}), 404

    data = request.get_json() or {}
    claimant_name = data.get('claimant_name')
    claimant_email = data.get('claimant_email')
    claimant_phone = data.get('claimant_phone', '')
    proof_details = data.get('proof_details')

    if not all([claimant_name, claimant_email, proof_details]):
        return jsonify({'error': 'Name, email, and proof details are required'}), 400

    claim_id = database.create_claim({
        'item_id': item_id,
        'claimant_name': claimant_name,
        'claimant_email': claimant_email,
        'claimant_phone': claimant_phone,
        'proof_details': proof_details
    })

    return jsonify({
        'message': 'Claim request submitted! Keep your Claim ID to track status.',
        'claim_id': claim_id
    }), 201

@app.route('/api/items/<int:item_id>/claims-list', methods=['POST'])
def get_item_claims(item_id):
    data = request.get_json() or {}
    pin = data.get('pin')
    claims, err = database.get_claims_for_item(item_id, pin)
    if err:
        return jsonify({'error': err}), 401
    return jsonify({'claims': claims})

@app.route('/api/items/<int:item_id>/claims/<int:claim_id>/action', methods=['POST'])
def action_claim(item_id, claim_id):
    data = request.get_json() or {}
    pin = data.get('pin')
    action = data.get('action') # 'approved' or 'rejected'
    response_note = data.get('response_note', '')

    if action not in ('approved', 'rejected'):
        return jsonify({'error': 'Invalid action. Must be approved or rejected'}), 400

    success, msg = database.update_claim_status(item_id, claim_id, pin, action, response_note)
    if not success:
        return jsonify({'error': msg}), 401

    return jsonify({'message': f'Claim {action} successfully!'})

@app.route('/api/items/<int:item_id>/check-claim', methods=['POST'])
def check_claim(item_id):
    data = request.get_json() or {}
    claim_id = data.get('claim_id')
    claimant_email = data.get('claimant_email')

    if not claim_id or not claimant_email:
        return jsonify({'error': 'Claim ID and Email are required'}), 400

    claim, err = database.get_claim_details_for_claimant(item_id, int(claim_id), claimant_email)
    if err:
        return jsonify({'error': err}), 404

    return jsonify({'claim': claim})

@app.route('/api/items/<int:item_id>/status', methods=['POST'])
def change_item_status(item_id):
    data = request.get_json() or {}
    pin = data.get('pin')
    new_status = data.get('status')

    if new_status not in ('active', 'claimed', 'returned'):
        return jsonify({'error': 'Invalid status'}), 400

    success, msg = database.update_item_status(item_id, pin, new_status)
    if not success:
        return jsonify({'error': msg}), 401

    return jsonify({'message': msg})

@app.route('/api/items/<int:item_id>', methods=['DELETE'])
def delete_item(item_id):
    data = request.get_json() or {}
    pin = data.get('pin')

    success, msg = database.delete_item(item_id, pin)
    if not success:
        return jsonify({'error': msg}), 401

    return jsonify({'message': msg})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print(f"Lost & Found Server running on http://127.0.0.1:{port}")
    app.run(host='127.0.0.1', port=port, debug=True)
