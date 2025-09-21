  let currentSection = 1;
        const totalSections = 13; 
        const formData = {};

        function updateProgress() {
            let totalQuestions = 13;
            let currentQuestion;
            
            if (currentSection === 1) {
                currentQuestion = 1; // Primeira seção mostra pergunta 1-3
            } else {
                currentQuestion = currentSection ; // Demais seções ajustadas
            }
            
            const percentage = Math.round((currentQuestion / totalQuestions) * 100);
            document.getElementById('progress-percentage').textContent = `${percentage}%`;
            document.getElementById('progress-fill').style.width = `${percentage}%`;
            
            if (currentSection === 1) {
                document.getElementById('current-question').textContent = '1';
            } else {
                document.getElementById('current-question').textContent = currentQuestion;
            }
        }

        function showSection(sectionNumber) {
            // Esconder seção atual
            document.getElementById(`section-${currentSection}`).classList.remove('active');
            
            // Mostrar nova seção
            document.getElementById(`section-${sectionNumber}`).classList.add('active');
            
            // Atualizar progresso
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

            // Validar se pelo menos uma opção foi selecionada nas seções com cards
            const optionCards = section.querySelectorAll('.option-card.selected');
            const hasOptions = section.querySelectorAll('.option-card').length > 0;
            
            if (hasOptions && optionCards.length === 0) {
                alert('Por favor, selecione uma opção.');
                return false;
            }

            return true;
        }

        function selectOption(card, fieldName, value) {
            // Remover seleção de todos os cards do mesmo grupo
            const allCards = card.parentElement.querySelectorAll('.option-card');
            allCards.forEach(c => c.classList.remove('selected'));
            
            // Selecionar o card clicado
            card.classList.add('selected');
            
            // Salvar valor no formData
            formData[fieldName] = value;

            // Atualizar o valor do input hidden correspondente, se existir
            const hiddenInput = document.getElementById(fieldName);
            if (hiddenInput) {
                hiddenInput.value = value;
            }
        }

        function collectFormData() {
            // Coletar dados dos inputs de texto e hidden
            const inputs = document.querySelectorAll('input[type="text"], textarea, input[type="hidden"]');
            inputs.forEach(input => {
                if (input.value.trim()) {
                    formData[input.name] = input.value.trim();
                }
            });

            // Adicionar timestamp
            formData.timestamp = new Date().toISOString();
            
            return formData;
        }

        async function saveToSheetDB(data) {
            try {
                const response = await fetch(`${process.env.HF_TOKEN}`, {
                    method: 'POST',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${process.env.SHEETDB_API_KEY}`
                    },
                    body: JSON.stringify({
                        data: [data]
                    })
                });

                if (!response.ok) {
                    throw new Error('Erro ao salvar dados');
                }

                return await response.json();
            } catch (error) {
                console.error('Erro ao salvar no SheetDB:', error);
                throw error;
            }
        }

        async function generateDiagnostic(userData) {
            const prompt = `
Você é uma consultora especialista em negócios de moda. Sua tarefa é analisar as respostas de um questionário e identificar os principais problemas do negócio.

# INSTRUÇÕES:
1. Analise as respostas do usuário abaixo
2. Identifique os 3 problemas principais mais urgentes
3. Para cada problema, forneça uma explicação curta
4. Retorne um JSON estruturado com:
   - problemas_principais: array com os 3 problemas
   - explicacao: objeto com explicação para cada problema
   - proximo_passo: string com sugestão de ação

# RESPOSTAS DO USUÁRIO:
${JSON.stringify(userData, null, 2)}

# FORMATO DE SAÍDA ESPERADO (apenas JSON):
{
  "problemas_principais": [],
  "explicacao": {},
  "proximo_passo": ""
}
            `;

            try {
                const response = await fetch('https://router.huggingface.co/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `${process.env.HF_TOKEN}`
                    },
                    body: JSON.stringify({
                        model: "Qwen/Qwen3-Next-80B-A3B-Instruct:novita",
                        messages: [
                            {
                                role: "user",
                                content: prompt
                            }
                        ]
                    })
                });

                if (!response.ok) {
                    throw new Error('Erro na API do HuggingFace');
                }

                const result = await response.json();
                const content = result.choices[0].message.content;
                
                try {
                    return JSON.parse(content);
                } catch (e) {
                    console.error('Erro ao parsear JSON:', e);
                    return null;
                }
            } catch (error) {
                console.error('Erro ao gerar diagnóstico:', error);
                return null;
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

            diagnostic.problemas_principais.forEach((problema, index) => {
                html += `
                    <div class="problem-item">
                        <h4>${index + 1}. ${problema}</h4>
                        <p>${diagnostic.explicacao[problema] || 'Explicação não disponível'}</p>
                    </div>
                `;
            });

            html += `
                    <div class="next-step">
                        <h4>Próximo Passo Recomendado:</h4>
                        <p>${diagnostic.proximo_passo}</p>
                    </div>
                </div>
            `;

            content.innerHTML = html;
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
                
                // Salvar no Google Sheets
                await saveToSheetDB(data);
                
                // Gerar diagnóstico
                const diagnostic = await generateDiagnostic(data);
                
                // Mostrar resultado
                document.getElementById('loading').classList.remove('active');
                document.getElementById('diagnostic-result').classList.add('active');
                
                // Exibir diagnóstico
                displayDiagnostic(diagnostic);
                
            } catch (error) {
                console.error('Erro ao processar formulário:', error);
                alert('Houve um erro ao processar suas respostas. Tente novamente.');
                
                // Voltar para a última seção
                document.getElementById('loading').classList.remove('active');
                document.getElementById(`section-${totalSections}`).classList.add('active');
            }
        }

        // Inicializar
        updateProgress();

        // Validação do Instagram
        document.getElementById('instagram').addEventListener('blur', function() {
            if (this.value && !this.value.startsWith('@')) {
                this.value = '@' + this.value;
            }
        });