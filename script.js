let currentSection = 1;
const totalSections = 13; 
const formData = {};

function updateProgress() {
    const percentage = Math.round((currentSection / totalSections) * 100);
    document.getElementById('progress-percentage').textContent = `${percentage}%`;
    document.getElementById('progress-fill').style.width = `${percentage}%`;
    document.getElementById('current-question').textContent = currentSection;
}

function showSection(sectionNumber) {
    document.getElementById(`section-${currentSection}`).classList.remove('active');
    document.getElementById(`section-${sectionNumber}`).classList.add('active');
    currentSection = sectionNumber;
    updateProgress();
}

function nextSection() {
    if (validateCurrentSection()) {
        if (currentSection < totalSections) {
            showSection(currentSection + 1);
        }
    }
}

function prevSection() {
    if (currentSection > 1) {
        showSection(currentSection - 1);
    }
}

function validateCurrentSection() {
    const section = document.getElementById(`section-${currentSection}`);
    const requiredInputs = section.querySelectorAll('input[required], textarea[required]');
    
    for (let input of requiredInputs) {
        if (!input.value.trim()) {
            alert('Por favor, preencha todos os campos obrigatórios.');
            input.focus();
            return false;
        }
    }

    const optionCards = section.querySelectorAll('.option-card.selected');
    const hasOptions = section.querySelectorAll('.option-card').length > 0;
    
    if (hasOptions && optionCards.length === 0) {
        alert('Por favor, selecione uma opção.');
        return false;
    }

    return true;
}

function selectOption(card, fieldName, value) {
    const allCards = card.parentElement.querySelectorAll('.option-card');
    allCards.forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    formData[fieldName] = value;

    const hiddenInput = document.getElementById(fieldName);
    if (hiddenInput) {
        hiddenInput.value = value;
    }
}

function collectFormData() {
    const inputs = document.querySelectorAll('input[type="text"], input[type="email"], textarea, input[type="hidden"]');
    inputs.forEach(input => {
        if (input.value.trim()) {
            formData[input.name] = input.value.trim();
        }
    });
    
    return formData;
}

async function submitForm() {
    if (!validateCurrentSection()) {
        return;
    }

    // Mostrar loading
    document.getElementById(`section-${currentSection}`).classList.remove('active');
    document.getElementById('loading').classList.add('active');

    try {
        // Coletar dados do formulário
        const data = collectFormData();
        
        console.log('Dados coletados:', data);
        
        // ⭐⭐ MAPEAMENTO CORRETO DOS CAMPOS ⭐⭐
        const requestBody = {
            nome: data.nome_completo || '', // Mapeia nome_completo para nome
            company: data.nome_empresa || '', // Mapeia nome_empresa para company
            instagram: data.instagram || '',
            email: data.email || '',
            respostas: data // Todas as respostas do formulário
        };

        console.log('Enviando para API:', requestBody);

        // Validar campos obrigatórios
        if (!requestBody.nome || !requestBody.company || !requestBody.instagram || !requestBody.email) {
            throw new Error('Preencha todos os campos obrigatórios: nome completo, empresa, instagram e email');
        }

        // ⭐⭐ ENVIAR PARA SEU SERVER NO RENDER ⭐⭐
        const response = await fetch('https://serverbiaoli.onrender.com/api/diagnostico', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });

        console.log('Status da resposta:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.log('Resposta de erro:', errorText);
            throw new Error(`Erro do servidor: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        console.log('Resposta do servidor:', result);
        
        if (result.success) {
            document.getElementById('loading').classList.remove('active');
            document.getElementById('diagnostic-result').classList.add('active');
            displayDiagnostic(result.lead.diagnostico);
        } else {
            throw new Error(result.error || 'Erro ao processar diagnóstico');
        }
        
    } catch (error) {
        console.error('Erro ao processar formulário:', error);
        alert('Erro: ' + error.message);
        
        // Voltar para a última seção
        document.getElementById('loading').classList.remove('active');
        document.getElementById(`section-${totalSections}`).classList.add('active');
    }
}

function displayDiagnostic(diagnostic) {
    const content = document.getElementById('diagnostic-content');
    
    if (!diagnostic) {
        content.innerHTML = `
            <div class="diagnostic-result">
                <h3>Erro ao gerar diagnóstico</h3>
                <p>Houve um problema ao processar suas respostas. Tente novamente mais tarde.</p>
            </div>
        `;
        return;
    }

    let html = `
        <div class="diagnostic-result">
            <h3>Principais Problemas Identificados:</h3>
    `;

    if (diagnostic.problemas_principais && diagnostic.problemas_principais.length > 0) {
        diagnostic.problemas_principais.forEach((problema, index) => {
            html += `
                <div class="problem-item">
                    <h4>${index + 1}. ${problema}</h4>
                    <p>${diagnostic.explicacao[problema] || diagnostic.explicacao[`problema${index + 1}`] || 'Explicação não disponível'}</p>
                </div>
            `;
        });
    } else {
        html += `<p>Não foi possível identificar problemas específicos.</p>`;
    }

    html += `
            <div class="next-step">
                <h4>Próximo Passo Recomendado:</h4>
                <p>${diagnostic.proximo_passo || 'Considere buscar orientação especializada para otimizar seu negócio.'}</p>
            </div>
        </div>
    `;

    content.innerHTML = html;
}

// Inicializar
updateProgress();

// Validação do Instagram
document.getElementById('instagram').addEventListener('blur', function() {
    if (this.value && !this.value.startsWith('@')) {
        this.value = '@' + this.value;
    }
});

