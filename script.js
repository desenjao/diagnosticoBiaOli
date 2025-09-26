// Configuração global
const API_BASE_URL = "https://serverbiaoli.onrender.com/api"
let currentSection = 1
const totalSections = 4
const formData = {}
let dynamicQuestions = []

// Inicialização
document.addEventListener("DOMContentLoaded", () => {
  updateProgress()
  setupEventListeners()
})

// Event listeners
function setupEventListeners() {
  // Validação do Instagram
  const instagramInput = document.getElementById("instagram")
  if (instagramInput) {
    instagramInput.addEventListener("blur", function () {
      if (this.value && !this.value.startsWith("@")) {
        this.value = "@" + this.value
      }
    })
  }

  // Validação em tempo real dos campos obrigatórios
  const requiredInputs = document.querySelectorAll("input[required], select[required]")
  requiredInputs.forEach((input) => {
    input.addEventListener("input", function () {
      if (this.value.trim()) {
        this.style.borderColor = "var(--success)"
      } else {
        this.style.borderColor = "var(--gray)"
      }
    })
  })
}

// Atualização do progresso
function updateProgress() {
  const percentage = Math.round((currentSection / totalSections) * 100)
  document.getElementById("progress-percentage").textContent = `${percentage}%`
  document.getElementById("progress-fill").style.width = `${percentage}%`
  document.getElementById("current-step").textContent = currentSection
  document.getElementById("total-steps").textContent = totalSections
}

// Navegação entre seções
function showSection(sectionId) {
  // Esconder todas as seções
  document.querySelectorAll(".form-section").forEach((section) => {
    section.classList.remove("active")
  })

  // Mostrar seção específica
  const targetSection = document.getElementById(sectionId)
  if (targetSection) {
    targetSection.classList.add("active")

    // Atualizar currentSection se for uma seção numerada
    if (sectionId.startsWith("section-") && !isNaN(sectionId.split("-")[1])) {
      currentSection = Number.parseInt(sectionId.split("-")[1])
      updateProgress()
    }
  }
}

function nextSection() {
  if (validateCurrentSection()) {
    if (currentSection < totalSections) {
      currentSection++
      showSection(`section-${currentSection}`)
    }
  }
}

function prevSection() {
  if (currentSection > 1) {
    currentSection--
    showSection(`section-${currentSection}`)
  }
}

// Validação de seções
function validateCurrentSection() {
  const section = document.getElementById(`section-${currentSection}`)
  if (!section) return false

  // Validar campos obrigatórios
  const requiredInputs = section.querySelectorAll("input[required], select[required], textarea[required]")
  for (const input of requiredInputs) {
    if (!input.value.trim()) {
      showError(`Por favor, preencha o campo: ${input.previousElementSibling.textContent.replace("*", "").trim()}`)
      input.focus()
      return false
    }
  }

  // Validar opções selecionadas
  const optionGroups = section.querySelectorAll(".options-grid")
  for (const group of optionGroups) {
    const selectedOptions = group.querySelectorAll(".option-card.selected")
    if (selectedOptions.length === 0) {
      showError("Por favor, selecione uma opção.")
      return false
    }
  }

  // Validação específica para seção 3 (perguntas dinâmicas)
  if (currentSection === 3) {
    return validateDynamicQuestions()
  }

  return true
}

function validateDynamicQuestions() {
  let isValid = true

  dynamicQuestions.forEach((question) => {
    if (question.tipo === "single_choice") {
      const selectedOption = document.querySelector(`[data-question-id="${question.id}"].selected`)
      if (!selectedOption) {
        showError(`Por favor, responda: ${question.pergunta}`)
        isValid = false
      }
    } else if (question.tipo === "text") {
      const textarea = document.getElementById(question.id)
      if (!textarea || !textarea.value.trim()) {
        showError(`Por favor, responda: ${question.pergunta}`)
        if (textarea) textarea.focus()
        isValid = false
      }
    }
  })

  return isValid
}

// Seleção de opções
function selectOption(card, fieldName, value) {
  // Remover seleção de outras opções do mesmo grupo
  const allCards = card.parentElement.querySelectorAll(".option-card")
  allCards.forEach((c) => c.classList.remove("selected"))

  // Selecionar a opção clicada
  card.classList.add("selected")

  // Salvar valor
  formData[fieldName] = value

  // Atualizar campo hidden se existir
  const hiddenInput = document.getElementById(fieldName)
  if (hiddenInput) {
    hiddenInput.value = value
  }
}

// Seleção de opções dinâmicas
function selectDynamicOption(questionId, value, element) {
  // Remover seleção de outras opções da mesma pergunta
  const allOptions = document.querySelectorAll(`[data-question-id="${questionId}"]`)
  allOptions.forEach((opt) => opt.classList.remove("selected"))

  // Adicionar seleção à opção clicada
  element.classList.add("selected")

  // Salvar resposta
  formData[questionId] = value
}

// Geração de perguntas dinâmicas
async function generateDynamicQuestions() {
  if (!validateCurrentSection()) {
    return
  }

  // Coletar dados do contexto
  const contexto = {
    nicho: document.getElementById("nicho").value.trim(),
    tempo_mercado: document.getElementById("tempo_mercado").value,
    segmento: document.getElementById("segmento")?.value || "nao_informado",
    estagio_negocio: document.getElementById("estagio_negocio").value,
    principal_desafio: formData.principal_desafio,
  }

  // Validar dados obrigatórios
  if (!contexto.nicho || !contexto.tempo_mercado || !contexto.estagio_negocio || !contexto.principal_desafio) {
    showError("Por favor, preencha todos os campos antes de continuar.")
    return
  }

  // Mostrar loading
  showSection("section-loading")

  try {
    const queryParams = new URLSearchParams(contexto)
    const response = await fetch(`${API_BASE_URL}/perguntas-dinamicas?${queryParams}`)

    if (!response.ok) {
      throw new Error(`Erro ${response.status}: ${response.statusText}`)
    }

    const result = await response.json()

    if (result.success && result.perguntas) {
      dynamicQuestions = result.perguntas
      renderDynamicQuestions()
      currentSection = 3
      showSection("section-3")
    } else {
      throw new Error(result.error || "Erro ao gerar perguntas")
    }
  } catch (error) {
    console.error("Erro ao gerar perguntas dinâmicas:", error)
    showError(`Erro ao carregar perguntas: ${error.message}`)
    currentSection = 2
    showSection("section-2")
  }
}

// Renderização de perguntas dinâmicas
function renderDynamicQuestions() {
  const container = document.getElementById("dynamic-questions-container")
  if (!container) return

  container.innerHTML = ""

  dynamicQuestions.forEach((pergunta, index) => {
    const questionDiv = document.createElement("div")
    questionDiv.className = "form-group"

    let questionHtml = `
            <label>${pergunta.pergunta} <span class="required">*</span></label>
        `

    if (pergunta.tipo === "single_choice" && pergunta.opcoes) {
      questionHtml += '<div class="options-grid">'
      pergunta.opcoes.forEach((opcao) => {
        questionHtml += `
                    <div class="option-card" 
                         data-question-id="${pergunta.id}"
                         onclick="selectDynamicOption('${pergunta.id}', '${opcao.valor}', this)">
                        <span>${opcao.texto}</span>
                    </div>
                `
      })
      questionHtml += "</div>"
    } else if (pergunta.tipo === "text") {
      questionHtml += `
                <textarea id="${pergunta.id}" 
                         name="${pergunta.id}" 
                         required 
                         placeholder="Digite sua resposta..."
                         onchange="formData['${pergunta.id}'] = this.value"></textarea>
            `
    }

    questionDiv.innerHTML = questionHtml
    container.appendChild(questionDiv)
  })
}

// Coleta de dados do formulário
function collectFormData() {
  // Coletar dados das seções 1 e 2
  const inputs = document.querySelectorAll(
    "#section-1 input, #section-1 textarea, #section-1 select, #section-2 input, #section-2 textarea, #section-2 select",
  )
  inputs.forEach((input) => {
    if (input.value.trim()) {
      formData[input.name || input.id] = input.value.trim()
    }
  })

  // Coletar respostas das perguntas dinâmicas (tipo texto)
  dynamicQuestions.forEach((pergunta) => {
    if (pergunta.tipo === "text") {
      const textarea = document.getElementById(pergunta.id)
      if (textarea && textarea.value.trim()) {
        formData[pergunta.id] = textarea.value.trim()
      }
    }
  })

  return formData
}

// Envio do formulário
async function submitForm() {
  if (!validateCurrentSection()) {
    return
  }

  // Mostrar loading do diagnóstico
  showSection("section-loading")

  try {
    const data = collectFormData()

    const requestBody = {
      nome: data.nome_completo || "",
      company: data.nome_empresa || "",
      instagram: data.instagram || "",
      email: data.email || "",
      respostas: data,
    }

    // Validar campos obrigatórios
    if (!requestBody.nome || !requestBody.company || !requestBody.instagram || !requestBody.email) {
      throw new Error("Preencha todos os campos obrigatórios")
    }

    console.log("Enviando dados:", requestBody)

    const response = await fetch(`${API_BASE_URL}/diagnostico`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || `Erro ${response.status}: ${response.statusText}`)
    }

    const result = await response.json()

    if (result.success) {
      displayDiagnostic(result.lead.diagnostico)
      showSection("section-result")
    } else {
      throw new Error(result.error || "Erro ao processar diagnóstico")
    }
  } catch (error) {
    console.error("Erro ao enviar formulário:", error)
    showError(`Erro: ${error.message}`)
    currentSection = 3
    showSection("section-3")
  }
}

// Exibição do diagnóstico
function displayDiagnostic(diagnostic) {
  const content = document.getElementById("diagnostic-content")
  if (!content) return

  if (!diagnostic) {
    content.innerHTML = `
            <div class="diagnostic-result">
                <h3>Erro ao gerar diagnóstico</h3>
                <p>Houve um problema ao processar suas respostas. Tente novamente.</p>
            </div>
        `
    return
  }

  let html = `
        <div class="diagnostic-result">
            <h3><i class="fas fa-exclamation-triangle" style="color: var(--warning); margin-right: 8px;"></i>Principais Problemas Identificados:</h3>
    `

  if (diagnostic.problemas_principais && diagnostic.problemas_principais.length > 0) {
    diagnostic.problemas_principais.forEach((problema, index) => {
      const explicacao =
        diagnostic.explicacao && diagnostic.explicacao[problema]
          ? diagnostic.explicacao[problema]
          : "Análise detalhada não disponível"

      html += `
                <div class="problem-item">
                    <h4><i class="fas fa-arrow-right" style="color: var(--primary); margin-right: 6px;"></i>${index + 1}. ${problema}</h4>
                    <p>${explicacao}</p>
                </div>
            `
    })
  } else {
    html += `
            <div class="problem-item">
                <h4>Análise Geral</h4>
                <p>Com base nas suas respostas, identificamos oportunidades de melhoria no seu negócio.</p>
            </div>
        `
  }

  html += `
            <div class="next-step">
                <h4><i class="fas fa-lightbulb" style="color: var(--success); margin-right: 8px;"></i>Próximo Passo Recomendado:</h4>
                <p>${diagnostic.proximo_passo || "Considere buscar orientação especializada para desenvolver uma estratégia personalizada para o seu negócio."}</p>
            </div>
        </div>
    `

  content.innerHTML = html
}

// Utilitários
function showError(message) {
  // Remover alertas anteriores
  const existingAlerts = document.querySelectorAll(".alert-error")
  existingAlerts.forEach((alert) => alert.remove())

  // Criar novo alerta
  const alert = document.createElement("div")
  alert.className = "error alert-error"
  alert.innerHTML = `
        <i class="fas fa-exclamation-circle" style="margin-right: 8px;"></i>
        ${message}
    `

  // Inserir no topo do container atual
  const currentSectionEl = document.querySelector(".form-section.active")
  if (currentSectionEl) {
    currentSectionEl.insertBefore(alert, currentSectionEl.firstChild)

    // Remover após 5 segundos
    setTimeout(() => {
      if (alert.parentNode) {
        alert.remove()
      }
    }, 5000)

    // Scroll para o topo
    alert.scrollIntoView({ behavior: "smooth", block: "center" })
  }
}

function showSuccess(message) {
  const alert = document.createElement("div")
  alert.className = "success"
  alert.style.cssText = `
        background: #d4edda;
        color: #155724;
        padding: 10px;
        border-radius: 6px;
        margin: 10px 0;
        border-left: 3px solid #28a745;
    `
  alert.innerHTML = `
        <i class="fas fa-check-circle" style="margin-right: 8px;"></i>
        ${message}
    `

  const currentSectionEl = document.querySelector(".form-section.active")
  if (currentSectionEl) {
    currentSectionEl.insertBefore(alert, currentSectionEl.firstChild)

    setTimeout(() => {
      if (alert.parentNode) {
        alert.remove()
      }
    }, 3000)
  }
}

// Debug (remover em produção)
window.debugFormData = () => console.log("Form Data:", formData)
window.debugDynamicQuestions = () => console.log("Dynamic Questions:", dynamicQuestions)
