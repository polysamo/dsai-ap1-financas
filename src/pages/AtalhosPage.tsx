import { Card } from '../ds/Card';
import { TituloPagina } from '../components/ui';
import { atalhosPorGrupo } from '../lib/atalhos';
import '../components/OnboardingEAtalhos.css';

/** Lista completa dos atalhos de teclado, agrupados por tipo. */
export function AtalhosPage() {
  return (
    <div>
      <TituloPagina>Atalhos de teclado</TituloPagina>
      <div className="atalhos-grupos">
        {atalhosPorGrupo().map(({ grupo, atalhos }) => (
          <Card key={grupo} titulo={grupo}>
            <table className="atalhos-tabela">
              <caption className="ds-sr-somente">Atalhos de {grupo}</caption>
              <tbody>
                {atalhos.map((a) => (
                  <tr key={a.teclas}>
                    <td className="atalhos-tabela__teclas">
                      {a.teclas.split(' ').map((t, i) => (
                        <kbd key={i} className="atalhos-tecla">
                          {t}
                        </kbd>
                      ))}
                    </td>
                    <td className="atalhos-tabela__acao">{a.descricao}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        ))}
      </div>
    </div>
  );
}
