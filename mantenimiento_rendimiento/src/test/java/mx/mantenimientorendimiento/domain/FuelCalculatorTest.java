package mx.mantenimientorendimiento.domain;

import org.junit.jupiter.api.Test;
import java.math.BigDecimal;
import static org.junit.jupiter.api.Assertions.*;

class FuelCalculatorTest {
    private final FuelCalculator calculator=new FuelCalculator();
    private static BigDecimal d(String value){return new BigDecimal(value);}

    @Test void tractorDividesKilometersByTarget(){
        var result=calculator.calculate(EquipmentType.TRACTOR,d("1000"),d("350"),d("2.5"),d("28.99"));
        assertEquals(0,d("400").compareTo(result.estimatedLiters()));
        assertEquals(1_159_600,result.budgetCents());assertEquals(1_014_650,result.expenseCents());assertEquals(144_950,result.balanceCents());
    }
    @Test void thermoMultipliesHoursByLitersPerHour(){
        var result=calculator.calculate(EquipmentType.THERMO,d("100"),d("190"),d("1.7"),d("28.99"));
        assertEquals(0,d("170").compareTo(result.estimatedLiters()));assertEquals(-57_980,result.balanceCents());
        assertEquals(0,d("1.9").compareTo(result.observedRate()));
    }
    @Test void zeroAndMissingValuesCannotBecomeSavings(){
        for(BigDecimal bad:new BigDecimal[]{null,BigDecimal.ZERO,d("-1")}) {
            assertThrows(IllegalArgumentException.class,()->calculator.calculate(EquipmentType.TRACTOR,d("10"),bad,d("2.5"),d("28.99")));
            assertThrows(IllegalArgumentException.class,()->calculator.calculate(EquipmentType.THERMO,bad,d("10"),d("1.7"),d("28.99")));
        }
    }
    @Test void roundsFinancialTotalsOnceAndKeepsBalanceConsistent(){
        var result=calculator.calculate(EquipmentType.TRACTOR,d("551"),d("226"),d("2.5"),d("28.99"));
        assertEquals(638_940,result.budgetCents());assertEquals(655_174,result.expenseCents());assertEquals(-16_234,result.balanceCents());
        assertEquals(result.budgetCents()-result.expenseCents(),result.balanceCents());
    }
    @Test void nearZeroBudgetHasUnavailableVarianceInsteadOfDivisionError(){
        var result=calculator.calculate(EquipmentType.THERMO,d("0.00001"),d("1"),d("1.7"),d("1"));
        assertEquals(0,result.budgetCents());assertNull(result.budgetVariance());assertEquals(-100,result.balanceCents());
    }
    @Test void convertsDecimalAmountsToExactCents(){assertEquals(101,FuelCalculator.cents(d("1.005")));assertEquals(2899,FuelCalculator.cents(d("28.99")));}
}
