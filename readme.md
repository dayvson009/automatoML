- No Mercado Livre vá para: https://developers.mercadolivre.com.br/devcenter/create-app
- Autorize a conta com API do ML
- Preencha o formulário: (Nome, nomecurto 'sem espaços', Descrição rápida, Propósito: Pessoal, Usuários: 1 - 10)

Avançar

- URL Redirect: https://google.com
- Fluxos OAuth: selecione (Authorization Code, Client Credentials, Refresh Token)
- PKCE necessário (não seleciona)
- Negócios: escolha "[x] Mercado Livre"
- Permissões: Comunicações pré e pós-vendas (Leitura e Escrita), Venda e envios de um produto (Leitor)
- Tópicos: Orders (selecione: orders_v2, orders feedback), messages (todos), others: (Payments)
- URL de retornos de chamada de notificação: https://a670-179-48-228-38.ngrok-free.app/notificacao (Altere o NGROK ou domínio)

Preencha o .env:

YOUR_USER_ID=xxxxx id do seu ML para encontrar acesse sua loja online como comprador, e pegue o `_CustId` que mostra na URL
APP_ID=66xxxxxxxxx Gerado quando cria a aplicação `ID do aplicativo`
SECRET_KEY=OpPXxxxxxxxxxxxxxxxxxxx Gerado quando cria a aplicação `Chave secreta`
REDIRECT_URI=https://7e3c-179-48-228-37.ngrok-free.app/tg Ajustar de acordo com seu domínio ou seu NGROK


Para iniciar:
Inicie o NGROK - Mas precisará mudar toda configuração de URL no Mercado Livre
E modificar no .env

Tudo configurado.
Agora vamos no terminal e digitar: node app.js
Depois fazer o login, só acessar em qualquer navegador o link:
http://localhost:3000/login-ml

Pronto, agora só aguardar tudo funcionar


#DAYVSON
#YOUR_USER_ID=130694972
#APP_ID=6686028888756348
#SECRET_KEY=OpPXa9RNPW0rG1x35LCoO3LyoOQuZAxC
#REDIRECT_URI=https://7e3c-179-48-228-37.ngrok-free.app/tg


RETORNO GET MESSAGES DE UMA CONVERSA:
```JSON
{
    "paging": {
        "limit": 4,
        "offset": 1,
        "total": 85
    },
    "conversation_status": {
        "path": "/packs/2000015058865664/sellers/3081727995",
        "status": "active",
        "substatus": null,
        "status_date": "2026-02-23T10:38:07Z",
        "status_update_allowed": false,
        "claim_ids": [],
        "shipping_id": null,
        "data": null
    },
    "messages": [
        {
            "id": "019c875810d07bc880358f42341c47af",
            "site_id": "MLB",
            "client_id": null,
            "from": {
                "user_id": 3081727995
            },
            "to": {
                "user_id": 14924998
            },
            "status": "available",
            "subject": null,
            "text": "Ola, Keyller! \n",
            "message_date": {
                "received": "2026-02-22T21:53:41Z",
                "available": "2026-02-22T21:53:41Z",
                "notified": "2026-02-22T21:53:41Z",
                "created": "2026-02-22T21:53:41Z",
                "read": "2026-02-23T00:13:24Z"
            },
            "message_moderation": {
                "is_automatic": false,
                "status": "clean",
                "reason": null,
                "source": "online",
                "moderation_date": "2026-02-22T21:53:41Z"
            },
            "message_attachments": null,
            "message_resources": [
                {
                    "id": "2000015058865664",
                    "name": "packs"
                },
                {
                    "id": "3081727995",
                    "name": "sellers"
                }
            ],
            "conversation_first_message": false,
            "data": {
                "last_message_session_id": "armor.6dab78eb5dea97c60cf71200c97137387d3c1b25d4fb355e6d9138b397b87a07da9b692ad4f8b96f39c23c56f7e6514a09cab6153cd2926b3965eea75aa1b65a81d3e9b81a7ae5b0831f4ce093adb6a0301d674e6cfa5081d829c4be171d5923.5e661ab9efd376fc9ba151355d1684e3",
                "option_id": null,
                "order_creation_date": "2026-02-08T15:35:24Z",
                "original_conversation": null
            }
        },
        {
            "id": "019c80dfada7756984bdfd353294bfb0",
            "site_id": "MLB",
            "client_id": null,
            "from": {
                "user_id": 14924998
            },
            "to": {
                "user_id": 3081727995
            },
            "status": "available",
            "subject": null,
            "text": "Olá Meu amigo, conseguiu? fazer o vídeo?",
            "message_date": {
                "received": "2026-02-21T15:44:28Z",
                "available": "2026-02-21T15:44:28Z",
                "notified": "2026-02-21T15:44:28Z",
                "created": "2026-02-21T15:44:28Z",
                "read": "2026-02-22T21:53:07Z"
            },
            "message_moderation": {
                "is_automatic": false,
                "status": "clean",
                "reason": null,
                "source": "online",
                "moderation_date": "2026-02-21T15:44:28Z"
            },
            "message_attachments": null,
            "message_resources": [
                {
                    "id": "2000015058865664",
                    "name": "packs"
                },
                {
                    "id": "3081727995",
                    "name": "sellers"
                }
            ],
            "conversation_first_message": false,
            "data": {
                "last_message_session_id": "armor.c450ca5d00c7d71accb2618480adf871edae32d5f998b15ff1a6429229e078f8bae7f59da1f066500a5af6c1a36a3cef76fb9506ada74d13044942c85d3861129b8088fc19b66638557950ee60ada325ca7fb7a138184aad431454f5618c7bc4.3eae3362d1b8314b89e12acc1e5274ef",
                "option_id": null,
                "order_creation_date": "2026-02-08T15:35:24Z",
                "original_conversation": null
            }
        },
        {
            "id": "019c7ab7991278058720dbe08b3dd907",
            "site_id": "MLB",
            "client_id": null,
            "from": {
                "user_id": 3081727995
            },
            "to": {
                "user_id": 14924998
            },
            "status": "available",
            "subject": null,
            "text": "Vou organizar tudo e subo hoje ainda, e daremos esse suporte",
            "message_date": {
                "received": "2026-02-20T11:02:58Z",
                "available": "2026-02-20T11:02:58Z",
                "notified": "2026-02-20T11:02:58Z",
                "created": "2026-02-20T11:02:58Z",
                "read": "2026-02-21T15:39:26Z"
            },
            "message_moderation": {
                "is_automatic": false,
                "status": "clean",
                "reason": null,
                "source": "online",
                "moderation_date": "2026-02-20T11:02:58Z"
            },
            "message_attachments": null,
            "message_resources": [
                {
                    "id": "2000015058865664",
                    "name": "packs"
                },
                {
                    "id": "3081727995",
                    "name": "sellers"
                }
            ],
            "conversation_first_message": false,
            "data": {
                "last_message_session_id": "armor.6ea46201ae4cdd85c5bc5f74ad580800593fb96db993fadf066bcfe8c632ca23525313651214f1d0ae474dadc909ce99bfed0e6fd1ed7b0626d5d7c4e780d1362192f34095533d1468d361302ef8895ea0dec57635d421285b9d935933bd63dc.29e9b8e4f85879cb436d92306b2f7ccf",
                "option_id": null,
                "order_creation_date": "2026-02-08T15:35:24Z",
                "original_conversation": null
            }
        },
        {
            "id": "019c7ab76ab37defa12958682a36d175",
            "site_id": "MLB",
            "client_id": null,
            "from": {
                "user_id": 3081727995
            },
            "to": {
                "user_id": 14924998
            },
            "status": "available",
            "subject": null,
            "text": "Perfeito, hoje eu consigo a noite, pode ser? fizemos vários testes e gravamos um vídeo, para auxiliar.",
            "message_date": {
                "received": "2026-02-20T11:02:46Z",
                "available": "2026-02-20T11:02:46Z",
                "notified": "2026-02-20T11:02:46Z",
                "created": "2026-02-20T11:02:46Z",
                "read": "2026-02-21T15:39:26Z"
            },
            "message_moderation": {
                "is_automatic": false,
                "status": "clean",
                "reason": null,
                "source": "online",
                "moderation_date": "2026-02-20T11:02:46Z"
            },
            "message_attachments": null,
            "message_resources": [
                {
                    "id": "2000015058865664",
                    "name": "packs"
                },
                {
                    "id": "3081727995",
                    "name": "sellers"
                }
            ],
            "conversation_first_message": false,
            "data": {
                "last_message_session_id": "armor.6ea46201ae4cdd85c5bc5f74ad580800593fb96db993fadf066bcfe8c632ca23525313651214f1d0ae474dadc909ce99bfed0e6fd1ed7b0626d5d7c4e780d1362192f34095533d1468d361302ef8895ea0dec57635d421285b9d935933bd63dc.29e9b8e4f85879cb436d92306b2f7ccf",
                "option_id": null,
                "order_creation_date": "2026-02-08T15:35:24Z",
                "original_conversation": null
            }
        }
    ],
    "seller_max_message_length": 3500,
    "buyer_max_message_length": 3500
}
```


RETORNO DE UM GET ORDER ID
```JSON
{
    "id": 2000015223405316,
    "date_created": "2026-02-20T12:02:09.000-04:00",
    "last_updated": "2026-02-20T12:03:52.000-04:00",
    "date_closed": "2026-02-20T12:02:13.000-04:00",
    "pack_id": null,
    "fulfilled": null,
    "buying_mode": "buy_equals_pay",
    "shipping_cost": null,
    "mediations": [],
    "total_amount": 147.2,
    "paid_amount": 147.2,
    "order_items": [
        {
            "item": {
                "id": "MLB6256521662",
                "title": "Camtasia Studio 2026 Ativação Original Atualizado",
                "category_id": "MLB1731",
                "variation_id": null,
                "seller_custom_field": null,
                "variation_attributes": [],
                "warranty": "Garantia do vendedor: 10 anos",
                "condition": "new",
                "seller_sku": null,
                "global_price": null,
                "net_weight": null,
                "user_product_id": "MLBU3791466881",
                "release_date": null,
                "attributes": [
                    {
                        "id": "ITEM_CONDITION",
                        "values": [
                            {
                                "id": "2230284"
                            }
                        ]
                    }
                ]
            },
            "quantity": 1,
            "requested_quantity": {
                "measure": "unit",
                "value": 1
            },
            "picked_quantity": null,
            "unit_price": 147.2,
            "full_unit_price": 147.2,
            "full_unit_price_currency_id": "BRL",
            "currency_id": "BRL",
            "manufacturing_days": null,
            "sale_fee": 26.5,
            "listing_type_id": "gold_pro",
            "base_exchange_rate": null,
            "base_currency_id": null,
            "element_id": null,
            "discounts": null,
            "bundle": null,
            "compat_id": null,
            "stock": null,
            "kit_instance_id": null,
            "gross_price": 147.2
        }
    ],
    "currency_id": "BRL",
    "payments": [
        {
            "id": 146355422697,
            "order_id": 2000015223405316,
            "payer_id": 299335854,
            "collector": {
                "id": 3081727995
            },
            "card_id": 9540066966,
            "reason": "Camtasia Studio 2026 Ativação Original Atualizado",
            "site_id": "MLB",
            "payment_method_id": "master",
            "currency_id": "BRL",
            "installments": 4,
            "issuer_id": "24",
            "atm_transfer_reference": {
                "transaction_id": "627115603",
                "company_id": null
            },
            "coupon_id": null,
            "activation_uri": null,
            "operation_type": "regular_payment",
            "payment_type": "credit_card",
            "available_actions": [
                "refund"
            ],
            "status": "approved",
            "status_code": null,
            "status_detail": "accredited",
            "transaction_amount": 147.2,
            "transaction_amount_refunded": 0,
            "taxes_amount": 0,
            "shipping_cost": 0,
            "coupon_amount": 0,
            "overpaid_amount": 0,
            "total_paid_amount": 147.2,
            "installment_amount": 36.8,
            "deferred_period": null,
            "date_approved": "2026-02-20T12:02:13.000-04:00",
            "transaction_order_id": null,
            "date_created": "2026-02-20T12:02:10.000-04:00",
            "date_last_modified": "2026-02-20T12:02:13.000-04:00",
            "marketplace_fee": 0,
            "reference_id": null,
            "authorization_code": "080271"
        }
    ],
    "shipping": {
        "id": null
    },
    "status": "paid",
    "status_detail": null,
    "tags": [
        "no_shipping",
        "paid",
        "not_delivered"
    ],
    "static_tags": [],
    "feedback": {
        "seller": null,
        "buyer": null
    },
    "context": {
        "channel": "marketplace",
        "site": "MLB",
        "flows": []
    },
    "seller": {
        "id": 3081727995
    },
    "buyer": {
        "id": 299335854,
        "nickname": "LUCASGONALVESASSIS",
        "first_name": "Lucas Gonçalves",
        "last_name": "Assis",
        "billing_info": {
            "id": "812715709869866016"
        }
    },
    "taxes": {
        "amount": null,
        "currency_id": null,
        "id": null
    },
    "cancel_detail": null,
    "manufacturing_ending_date": null,
    "order_request": {
        "change": null,
        "return": null
    },
    "related_orders": null
}
```