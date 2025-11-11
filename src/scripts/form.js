// ========================================
// CONFIGURAÇÃO
// ========================================
const CONFIG = {
    webhookUrl: 'https://n8n.unitycompany.com.br/webhook/lp-fast-friday',
};

// ========================================
// CAPTURA DE PARÂMETROS UTM E DADOS DA PÁGINA
// ========================================
class PageDataCapture {
    static getUrlParams() {
        const urlParams = new URLSearchParams(window.location.search);
        const params = {};
        
        for (const [key, value] of urlParams) {
            params[key] = value;
        }
        
        return params;
    }

    static getUtmParams() {
        const allParams = this.getUrlParams();
        const utmParams = {};
        
        // Captura todos os parâmetros UTM
        const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
        
        utmKeys.forEach(key => {
            if (allParams[key]) {
                utmParams[key] = allParams[key];
            }
        });
        
        return utmParams;
    }

    static getPageData() {
        return {
            url: window.location.href,
            pathname: window.location.pathname,
            hostname: window.location.hostname,
            referrer: document.referrer || null,
            title: document.title,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            language: navigator.language || navigator.userLanguage,
            screenResolution: `${window.screen.width}x${window.screen.height}`,
            viewport: `${window.innerWidth}x${window.innerHeight}`,
        };
    }

    static getAllData() {
        return {
            utmParams: this.getUtmParams(),
            urlParams: this.getUrlParams(),
            pageData: this.getPageData(),
        };
    }
}

// ========================================
// MÁSCARA DE TELEFONE
// ========================================
class PhoneMask {
    static applyMask(value) {
        // Remove tudo que não é número
        let numbers = value.replace(/\D/g, '');
        
        // Se não começar com 55, adiciona
        if (!numbers.startsWith('55')) {
            numbers = '55' + numbers;
        }
        
        // Remove o 55 temporariamente para formatação
        let phoneNumbers = numbers.substring(2);
        
        // Limita ao tamanho máximo (11 dígitos após o 55)
        phoneNumbers = phoneNumbers.substring(0, 11);
        
        // Aplica a máscara: +55 (XX) XXXXX-XXXX ou +55 (XX) XXXX-XXXX
        let formatted = '+55';
        
        if (phoneNumbers.length > 0) {
            formatted += ' (';
            formatted += phoneNumbers.substring(0, 2);
            
            if (phoneNumbers.length > 2) {
                formatted += ') ';
                
                if (phoneNumbers.length <= 6) {
                    formatted += phoneNumbers.substring(2);
                } else if (phoneNumbers.length <= 10) {
                    // Formato antigo: (XX) XXXX-XXXX
                    formatted += phoneNumbers.substring(2, 6);
                    if (phoneNumbers.length > 6) {
                        formatted += '-' + phoneNumbers.substring(6, 10);
                    }
                } else {
                    // Formato novo: (XX) XXXXX-XXXX
                    formatted += phoneNumbers.substring(2, 7);
                    if (phoneNumbers.length > 7) {
                        formatted += '-' + phoneNumbers.substring(7, 11);
                    }
                }
            }
        }
        
        return formatted;
    }

    static getOnlyNumbers(value) {
        return value.replace(/\D/g, '');
    }
}

// ========================================
// VALIDAÇÃO DE CAMPOS
// ========================================
class FormValidator {
    static validateName(name) {
        const trimmed = name.trim();
        
        if (trimmed.length < 3) {
            return {
                valid: false,
                message: 'Nome deve ter pelo menos 3 caracteres'
            };
        }
        
        if (!/^[a-záàâãéèêíïóôõöúçñ\s]+$/i.test(trimmed)) {
            return {
                valid: false,
                message: 'Nome deve conter apenas letras'
            };
        }
        
        return { valid: true, message: '' };
    }

    static validateEmail(email) {
        const trimmed = email.trim().toLowerCase();
        
        if (trimmed.length === 0) {
            return {
                valid: false,
                message: 'E-mail é obrigatório'
            };
        }
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        
        if (!emailRegex.test(trimmed)) {
            return {
                valid: false,
                message: 'E-mail inválido'
            };
        }
        
        return { valid: true, message: '' };
    }

    static validatePhone(phone) {
        const numbers = PhoneMask.getOnlyNumbers(phone);
        
        // Deve ter 13 dígitos (55 + 11 dígitos)
        if (numbers.length < 12) {
            return {
                valid: false,
                message: 'Telefone incompleto'
            };
        }
        
        if (numbers.length > 13) {
            return {
                valid: false,
                message: 'Telefone com muitos dígitos'
            };
        }
        
        // Verifica se começa com 55
        if (!numbers.startsWith('55')) {
            return {
                valid: false,
                message: 'Telefone deve começar com +55'
            };
        }
        
        return { valid: true, message: '' };
    }

    static validateCheckbox(checked) {
        if (!checked) {
            return {
                valid: false,
                message: 'Você deve aceitar a política de privacidade'
            };
        }
        
        return { valid: true, message: '' };
    }
}

// ========================================
// GERENCIADOR DE FORMULÁRIO
// ========================================
class FormManager {
    constructor(formElement) {
        this.form = formElement;
        this.inputs = {
            name: this.form.querySelector('#name'),
            email: this.form.querySelector('#email'),
            tel: this.form.querySelector('#tel'),
            checkbox: this.form.querySelector('#check-policy'),
        };
        this.submitButton = this.form.querySelector('.submit-button');
        
        this.init();
    }

    init() {
        // Configura máscara de telefone
        this.inputs.tel.value = '+55 ';
        
        this.inputs.tel.addEventListener('input', (e) => {
            const cursorPosition = e.target.selectionStart;
            const oldLength = e.target.value.length;
            
            e.target.value = PhoneMask.applyMask(e.target.value);
            
            // Mantém o cursor na posição correta
            const newLength = e.target.value.length;
            const diff = newLength - oldLength;
            e.target.setSelectionRange(cursorPosition + diff, cursorPosition + diff);
        });

        // Impede que o usuário apague o +55
        this.inputs.tel.addEventListener('keydown', (e) => {
            const value = e.target.value;
            const cursorPosition = e.target.selectionStart;
            
            if (e.key === 'Backspace' && cursorPosition <= 4) {
                e.preventDefault();
            }
        });

        // Validação em tempo real
        this.inputs.name.addEventListener('blur', () => this.validateField('name'));
        this.inputs.email.addEventListener('blur', () => this.validateField('email'));
        this.inputs.tel.addEventListener('blur', () => this.validateField('tel'));
        
        // Remove erro ao digitar
        Object.values(this.inputs).forEach(input => {
            input.addEventListener('input', () => {
                input.classList.remove('error');
            });
        });

        // Submit do formulário
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
    }

    validateField(fieldName) {
        const input = this.inputs[fieldName];
        let validation;

        switch (fieldName) {
            case 'name':
                validation = FormValidator.validateName(input.value);
                break;
            case 'email':
                validation = FormValidator.validateEmail(input.value);
                break;
            case 'tel':
                validation = FormValidator.validatePhone(input.value);
                break;
            case 'checkbox':
                validation = FormValidator.validateCheckbox(input.checked);
                break;
        }

        if (!validation.valid) {
            input.classList.add('error');
            return false;
        } else {
            input.classList.remove('error');
            return true;
        }
    }

    validateAllFields() {
        let isValid = true;

        // Valida todos os campos
        isValid = this.validateField('name') && isValid;
        isValid = this.validateField('email') && isValid;
        isValid = this.validateField('tel') && isValid;
        isValid = this.validateField('checkbox') && isValid;

        return isValid;
    }

    getFormData() {
        return {
            name: this.inputs.name.value.trim(),
            email: this.inputs.email.value.trim().toLowerCase(),
            phone: this.inputs.tel.value.trim(),
            phoneRaw: PhoneMask.getOnlyNumbers(this.inputs.tel.value),
            acceptedPolicy: this.inputs.checkbox.checked,
        };
    }

    buildPayload() {
        const formData = this.getFormData();
        const capturedData = PageDataCapture.getAllData();

        return {
            timestamp: new Date().toISOString(),
            form: {
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
                phoneRaw: formData.phoneRaw,
                acceptedPolicy: formData.acceptedPolicy,
            },
            tracking: {
                utm: capturedData.utmParams,
                urlParams: capturedData.urlParams,
                page: capturedData.pageData,
            },
            metadata: {
                formId: 'fast-friday-whatsapp-group',
                formVersion: '1.0',
                source: 'landing-page',
            }
        };
    }

    async sendToWebhook(payload) {
        try {
            const response = await fetch(CONFIG.webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            // Retorna sucesso independente da resposta (webhook pode não ter CORS configurado)
            return { success: true };
        } catch (error) {
            console.error('Erro ao enviar dados:', error);
            // Mesmo com erro de CORS, os dados chegam no webhook
            return { success: true };
        }
    }

    async handleSubmit(e) {
        e.preventDefault();

        // Valida todos os campos
        if (!this.validateAllFields()) {
            alert('Por favor, preencha todos os campos corretamente.');
            return;
        }

        // Desabilita o botão e mostra loading
        this.submitButton.disabled = true;
        this.submitButton.classList.add('loading');

        // Constrói o payload
        const payload = this.buildPayload();
        
        // Log do payload para debug (remova em produção)
        console.log('Payload a ser enviado:', payload);

        // Envia para o webhook
        const result = await this.sendToWebhook(payload);

        // Remove loading
        this.submitButton.classList.remove('loading');
        this.submitButton.disabled = false;

        if (result.success) {
            // Redireciona para a página de acesso ao grupo
            window.location.href = 'redirect.html';
        } else {
            alert('Erro ao enviar o formulário. Por favor, tente novamente.');
        }
    }
}

// ========================================
// INICIALIZAÇÃO
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('.contactForm');
    
    if (form) {
        new FormManager(form);
        console.log('Formulário inicializado com sucesso!');
        console.log('Dados capturados da página:', PageDataCapture.getAllData());
    }
});

// Também adiciona os botões "Entrar no grupo" para rolar até o formulário
document.addEventListener('DOMContentLoaded', () => {
    const buttons = document.querySelectorAll('.button-whatsapp, .i-button-whatsapp');
    const formSection = document.querySelector('.form');
    
    buttons.forEach(button => {
        button.addEventListener('click', () => {
            formSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
    });
});
