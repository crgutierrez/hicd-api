import requests
from bs4 import BeautifulSoup

# --- INFORMAÇÕES DE LOGIN (PREENCHA COM SEUS DADOS) ---
# Substitua "SEU_USUARIO" e "SUA_SENHA" pelas suas credenciais reais.
USUARIO = "SEU_USUARIO"
SENHA = "SUA_SENHA"
# ---------------------------------------------------------

# URLs do site
# Página inicial para obter cookies
INITIAL_URL = "https://hicd-hospub.sesau.ro.gov.br/prontuario/frontend/index.php"
# URL para onde os dados de login são enviados (descoberto na análise do JavaScript)
LOGIN_URL = "https://hicd-hospub.sesau.ro.gov.br/prontuario/frontend/controller/loginController.php"

# Usar uma sessão para manter os cookies de login
s = requests.Session()

try:
    # 1. Acessar a página inicial para iniciar a sessão e obter cookies
    print("Acessando a página inicial para obter cookies de sessão...")
    response_get = s.get(INITIAL_URL)
    response_get.raise_for_status()  # Verifica se a requisição foi bem-sucedida
    print("Cookies de sessão obtidos.")

    # 2. Montar os dados para o POST
    # Com base na análise do JavaScript da página
    payload = {
        'user': USUARIO,
        'pass': SENHA,
    }

    # 3. Enviar a requisição de login (POST)
    print(f"Enviando dados de login para o usuário: {USUARIO}...")
    # O cabeçalho Referer é importante para simular um request vindo da página de login
    headers = {
        "Referer": INITIAL_URL
    }
    response_post = s.post(LOGIN_URL, data=payload, headers=headers)
    response_post.raise_for_status()

    # 4. Verificar se o login foi bem-sucedido
    # O JavaScript da página espera uma resposta como "ok|..."
    if response_post.text.startswith("ok"):
        print("\nLogin realizado com sucesso!")
        print("A sessão está ativa. Você pode agora usar o objeto 's' para fazer outras requisições ao site.")
        
        # Exemplo: Acessar a página principal após o login para confirmar
        print("Acessando a página principal após o login...")
        response_main = s.get(INITIAL_URL)
        soup_main = BeautifulSoup(response_main.text, 'html.parser')
        
        # Procura por um elemento que indique que o usuário está logado (ex: nome do usuário ou botão de logout)
        # No HTML analisado, o nome do usuário aparece em um banner
        user_banner = soup_main.find(text="ANONYMOUS") # O HTML mostra ANONYMOUS antes do login
        if not user_banner:
             print("Confirmação de login: O nome do usuário foi encontrado na página.")
             print(f"Título da página principal: {soup_main.title.string}")
        else:
             print("Confirmação de login: Não foi possível encontrar o nome do usuário, mas o login parece ter funcionado.")

    else:
        print("\nFalha no login. Resposta do servidor:")
        print(response_post.text)


except requests.exceptions.RequestException as e:
    print(f"Ocorreu um erro de rede: {e}")
except Exception as e:
    print(f"Ocorreu um erro inesperado: {e}")